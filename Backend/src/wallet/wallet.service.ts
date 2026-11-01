import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { type Connection, isValidObjectId, type Model } from 'mongoose';
import Stripe from 'stripe';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment, IRefund } from '../database/schemas/appointment.schema';
import type { IWishWell } from '../database/schemas/social.schemas';
import type { IUser } from '../database/schemas/user.schema';
import type { IGiftEvent, IPayout, IWallet, IWalletTransaction } from '../database/schemas/wallet.schemas';
import { RealtimeGateway } from '../integrations/realtime.gateway';
import { EmailNotifications } from '../notifications/email-notifications';
import { namesMatch, PaystackService, toPayoutKobo } from '../payments/paystack.service';
import { COIN_PACKS, GIFTS, giftById, packById, walletSettings } from './catalog';

const DAY = 24 * 60 * 60 * 1000;

const ageOf = (dob?: string) => {
  const born = new Date(dob ?? '');
  if (Number.isNaN(born.getTime())) return null;
  return Math.floor((Date.now() - born.getTime()) / (365.25 * DAY));
};

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Coins, gifts and care funds. Every balance change runs in a MongoDB transaction
 * together with its ledger row, so money is never created, lost or double-counted.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger('Wallet');
  private stripeClient?: Stripe;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MODEL.wallet) private readonly wallets: Model<IWallet>,
    @InjectModel(MODEL.walletTransaction) private readonly ledger: Model<IWalletTransaction>,
    @InjectModel(MODEL.giftEvent) private readonly giftEvents: Model<IGiftEvent>,
    @InjectModel(MODEL.payout) private readonly payouts: Model<IPayout>,
    @InjectModel(MODEL.wishWell) private readonly entries: Model<IWishWell>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly realtime: RealtimeGateway,
    private readonly emails: EmailNotifications,
    private readonly paystack: PaystackService,
  ) {}

  private get stripe() {
    this.stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY as string);
    return this.stripeClient;
  }

  private async adultOrFail(userId: string, action: string) {
    const user = await this.users.findById(userId).select(['name', 'email', 'dob']);
    if (!user) fail('User not found', HttpStatus.NOT_FOUND);
    const age = ageOf(user.dob);
    if (age === null) fail(`Add your date of birth to your profile to ${action} (you must be 18 or over)`);
    if (age < walletSettings().minAge) fail(`You must be 18 or over to ${action}`);
    return user;
  }

  // --- reading ---

  async overview(userId: string) {
    const [wallet, transactions, pendingPayout, onWishWell] = await Promise.all([
      this.wallets.findOne({ userId }).lean(),
      this.ledger.find({ userId }).sort({ createdAt: -1 }).limit(40).select('-stripeSessionId').lean(),
      this.payouts.findOne({ userId, status: { $in: ['pending', 'processing'] } }).select('-accountNumber').lean(),
      this.entries.exists({ patientId: userId, consentGiven: true }),
    ]);
    const settings = walletSettings();
    return {
      success: true,
      coins: wallet?.coins ?? 0,
      fundCents: wallet?.fundCents ?? 0,
      fundLifetimeCents: wallet?.fundLifetimeCents ?? 0,
      // the care fund section is shown to anyone who is (or was) on the Wish Well or has received gifts
      hasCareFund: !!onWishWell || (wallet?.fundLifetimeCents ?? 0) > 0,
      pendingPayout,
      transactions,
      packs: COIN_PACKS,
      gifts: GIFTS,
      feePercent: settings.feePercent,
      minPayoutCents: settings.minPayoutCents,
      dailyGiftLimit: settings.dailyGiftLimit,
    };
  }

  catalog() {
    return { success: true, gifts: GIFTS, packs: COIN_PACKS, feePercent: walletSettings().feePercent };
  }

  /** Recent banner-worthy gifts (500+ coins), for the Wish Well banner. Public. */
  async recentBigGifts() {
    const minCoins = Math.min(...GIFTS.filter((g) => g.tier !== 'small').map((g) => g.coins));
    const events = await this.giftEvents
      .find({ coins: { $gte: minCoins }, createdAt: { $gte: new Date(Date.now() - 7 * DAY) } })
      .sort({ createdAt: -1 })
      .limit(20)
      .select(['fromName', 'toName', 'giftId', 'coins', 'entryId', 'createdAt'])
      .lean();
    return {
      success: true,
      gifts: events.map((e) => ({ ...e, gift: giftById(e.giftId) })),
    };
  }

  // --- buying coins ---

  async startTopup(userId: string, packId?: string) {
    const pack = packById(packId);
    if (!pack) fail('Pick a coin pack');
    await this.adultOrFail(userId, 'buy coins');

    const returnUrl = `${process.env.USER_URL}/wallet`;
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${returnUrl}?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?topup=cancelled`,
      metadata: { kind: 'coins', userId, packId: pack.id, coins: String(pack.coins) },
      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY || 'usd',
            product_data: {
              name: `${pack.coins.toLocaleString('en-US')} Wish Well coins`,
              description: 'Coins for sending gifts to Wish Well patients',
            },
            unit_amount: pack.cents,
          },
          quantity: 1,
        },
      ],
    });
    return { success: true, session_url: session.url };
  }

  /** Credits the coins once Stripe confirms the payment. Safe to call repeatedly. */
  async verifyTopup(userId: string, sessionId?: string) {
    if (!sessionId || typeof sessionId !== 'string') fail('Missing payment reference');
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    const meta = session.metadata ?? {};
    if (meta.kind !== 'coins' || meta.userId !== userId) fail('This payment is not a coin top-up for you', HttpStatus.FORBIDDEN);
    if (session.payment_status !== 'paid') fail('Payment not completed');
    return this.creditTopup(session);
  }

  /**
   * Adds the coins for a paid top-up checkout. Called when the buyer returns to the
   * site and by the Stripe webhook; whichever comes second finds it already done.
   */
  async creditTopup(session: Stripe.Checkout.Session) {
    const sessionId = session.id;
    const meta = session.metadata ?? {};
    const userId = meta.userId;
    if (meta.kind !== 'coins' || !userId || session.payment_status !== 'paid') fail('Not a paid coin top-up');

    const pack = packById(meta.packId);
    const coins = pack?.coins ?? Number(meta.coins);
    if (!coins || coins <= 0) fail('Unknown coin pack');

    let credited = false;
    const db = await this.connection.startSession();
    try {
      await db.withTransaction(async () => {
        // unique stripeSessionId: a second verify of the same payment can't credit again
        if (await this.ledger.exists({ stripeSessionId: sessionId }).session(db)) return;
        await this.ledger.create(
          [{ userId, kind: 'topup', coins, cents: session.amount_total ?? 0, stripeSessionId: sessionId }],
          { session: db },
        );
        await this.wallets.updateOne({ userId }, { $inc: { coins } }, { upsert: true, session: db });
        credited = true;
      });
    } catch (err: any) {
      if (err.code !== 11000) throw err; // 11000: another request credited it at the same moment
    } finally {
      await db.endSession();
    }

    const wallet = await this.wallets.findOne({ userId }).lean();
    if (credited) {
      const user = await this.users.findById(userId).select(['name', 'email']);
      if (user) this.emails.coinsPurchased(user, coins, session.amount_total ?? 0);
    }
    return {
      success: true,
      message: credited ? `${coins.toLocaleString('en-US')} coins added` : 'Coins already added',
      coins: wallet?.coins ?? 0,
    };
  }

  // --- gifting ---

  async sendGift(userId: string, body: { entryId?: string; giftId?: string; anonymous?: boolean; message?: string }) {
    const gift = giftById(body.giftId);
    if (!gift) fail('Pick a gift');
    if (!body.entryId || !isValidObjectId(body.entryId)) fail('Patient not found', HttpStatus.NOT_FOUND);

    const entry = await this.entries.findById(body.entryId);
    if (!entry || !entry.consentGiven || entry.optedOut) fail('Patient not found', HttpStatus.NOT_FOUND);
    if (entry.status === 'passed') fail('Gifts are closed for this patient. You can still send a free wish.');
    if (entry.patientId === userId) fail("You can't send a gift to yourself");

    const sender = await this.adultOrFail(userId, 'send gifts');
    const settings = walletSettings();

    const sentToday = await this.ledger.aggregate<{ total: number }>([
      { $match: { userId, kind: 'gift_sent', createdAt: { $gte: new Date(Date.now() - DAY) } } },
      { $group: { _id: null, total: { $sum: '$coins' } } },
    ]);
    const todayCoins = -(sentToday[0]?.total ?? 0);
    if (todayCoins + gift.coins > settings.dailyGiftLimit) {
      fail(`Daily gifting limit reached (${settings.dailyGiftLimit.toLocaleString('en-US')} coins a day)`);
    }

    const fundCents = Math.floor((gift.coins * (100 - settings.feePercent)) / 100);
    const anonymous = !!body.anonymous;
    const fromName = anonymous ? 'Someone' : sender.name;
    let event: IGiftEvent | undefined;

    const db = await this.connection.startSession();
    try {
      await db.withTransaction(async () => {
        const debited = await this.wallets.updateOne(
          { userId, coins: { $gte: gift.coins } },
          { $inc: { coins: -gift.coins } },
          { session: db },
        );
        if (!debited.modifiedCount) fail('Not enough coins. Top up your wallet first.', HttpStatus.PAYMENT_REQUIRED);

        await this.wallets.updateOne(
          { userId: entry.patientId },
          { $inc: { fundCents, fundLifetimeCents: fundCents } },
          { upsert: true, session: db },
        );
        await this.ledger.create(
          [
            {
              userId,
              kind: 'gift_sent',
              coins: -gift.coins,
              giftId: gift.id,
              counterpartyId: entry.patientId,
              counterpartyName: entry.patientName,
              entryId: String(entry._id),
            },
            {
              userId: entry.patientId,
              kind: 'gift_received',
              cents: fundCents,
              giftId: gift.id,
              counterpartyId: anonymous ? undefined : userId,
              counterpartyName: fromName,
              entryId: String(entry._id),
              note: `${gift.coins} coins, ${settings.feePercent}% platform fee`,
            },
          ],
          { session: db, ordered: true },
        );
        await this.entries.updateOne(
          { _id: entry._id },
          { $inc: { giftCount: 1, giftCoins: gift.coins } },
          { session: db },
        );
        [event] = await this.giftEvents.create(
          [
            {
              fromUserId: userId,
              fromName,
              anonymous,
              toUserId: entry.patientId,
              toName: entry.patientName,
              entryId: String(entry._id),
              giftId: gift.id,
              coins: gift.coins,
            },
          ],
          { session: db },
        );
      });
    } finally {
      await db.endSession();
    }

    // everyone sees banner/full-screen gifts live; the patient always sees theirs
    const live = {
      _id: event?._id,
      gift,
      fromName,
      toName: entry.patientName,
      entryId: String(entry._id),
      createdAt: event?.createdAt,
    };
    if (gift.tier !== 'small') this.realtime.emitAll('wishwell_gift', live);
    this.realtime.sendEmojiToUser(entry.patientId, { emoji: gift.emoji, fromName, isWishWell: true });

    const message = clean(body.message, 200);
    this.emails.giftReceived(entry.patientId, entry.patientName, gift, fromName, fundCents, message);

    const wallet = await this.wallets.findOne({ userId }).lean();
    return { success: true, message: `${gift.emoji} ${gift.name} sent to ${entry.patientName}`, coins: wallet?.coins ?? 0 };
  }

  // --- paying for appointments ---

  /**
   * Pays an appointment from the wallet: the care fund first (it's there for care), then
   * coins (1 coin = 1 cent). All or nothing, in one transaction with the appointment
   * update, so it can't be paid twice or leave a balance negative.
   */
  async payAppointment(userId: string, appointmentId?: string) {
    if (!appointmentId || !isValidObjectId(appointmentId)) fail('Appointment not found', HttpStatus.NOT_FOUND);
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) fail('Appointment not found', HttpStatus.NOT_FOUND);
    if (appointment.userId.toString() !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);
    if (appointment.cancelled || appointment.missed || appointment.isCompleted) fail('This appointment is closed');
    if (appointment.payment) fail('This appointment is already paid');

    const cost = Math.round(appointment.amount * 100);
    const wallet = await this.wallets.findOne({ userId }).lean();
    const fundCents = Math.min(wallet?.fundCents ?? 0, cost);
    const coins = cost - fundCents;
    if ((wallet?.coins ?? 0) < coins) {
      fail(
        `Not enough in your wallet: this costs $${(cost / 100).toFixed(2)} and you have $${(((wallet?.fundCents ?? 0) + (wallet?.coins ?? 0)) / 100).toFixed(2)} (care fund + coins)`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    let paid: IAppointment | null = null;
    const db = await this.connection.startSession();
    try {
      await db.withTransaction(async () => {
        const taken = await this.wallets.updateOne(
          { userId, fundCents: { $gte: fundCents }, coins: { $gte: coins } },
          { $inc: { fundCents: -fundCents, coins: -coins } },
          { session: db },
        );
        if (!taken.modifiedCount) fail('Your wallet balance changed; please try again', HttpStatus.CONFLICT);

        paid = await this.appointments.findOneAndUpdate(
          { _id: appointmentId, userId, payment: false, cancelled: false, isCompleted: false, missed: { $exists: false } },
          { $set: { payment: true, paymentMethod: 'wallet', walletPayment: { fundCents, coins } } },
          { returnDocument: 'after', session: db },
        );
        if (!paid) fail('This appointment is already paid');

        await this.ledger.create(
          [
            {
              userId,
              kind: 'appointment_payment',
              coins: -coins,
              cents: -fundCents,
              appointmentId,
              counterpartyName: appointment.docData?.name,
            },
          ],
          { session: db },
        );
      });
    } finally {
      await db.endSession();
    }

    this.emails.paymentReceived(paid!, 'wallet');
    const parts = [fundCents && `$${(fundCents / 100).toFixed(2)} from your care fund`, coins && `${coins.toLocaleString('en-US')} coins`]
      .filter(Boolean)
      .join(' + ');
    return { success: true, message: `Paid with ${parts}` };
  }

  /**
   * Gives a wallet-paid appointment's money back into the wallet: care fund first (up to
   * what came from it), the rest as coins. Runs once per appointment; returns the refund
   * record, or null if it wasn't paid from the wallet or was already refunded.
   */
  async refundAppointmentToWallet(appointmentId: string, percent: number, reason: 'missed' | 'cancelled') {
    const appointment = await this.appointments.findById(appointmentId).lean();
    if (!appointment || appointment.paymentMethod !== 'wallet' || !appointment.walletPayment || appointment.refund) {
      return null;
    }
    const paidFund = appointment.walletPayment.fundCents ?? 0;
    const paidCoins = appointment.walletPayment.coins ?? 0;
    const back = Math.round(((paidFund + paidCoins) * percent) / 100);
    const fundBack = Math.min(paidFund, back);
    const coinsBack = back - fundBack;
    const refund: IRefund = {
      percent,
      amount: back / 100,
      status: 'refunded',
      method: 'wallet',
      reason,
      at: new Date(),
    };

    let done = false;
    const db = await this.connection.startSession();
    try {
      await db.withTransaction(async () => {
        // claiming the refund field first makes this run once, even if called twice at once
        const claimed = await this.appointments.updateOne(
          { _id: appointmentId, refund: { $exists: false } },
          { $set: { refund } },
          { session: db },
        );
        if (!claimed.modifiedCount) return;
        await this.wallets.updateOne(
          { userId: appointment.userId },
          { $inc: { fundCents: fundBack, coins: coinsBack } },
          { upsert: true, session: db },
        );
        await this.ledger.create(
          [
            {
              userId: appointment.userId,
              kind: 'appointment_refund',
              coins: coinsBack,
              cents: fundBack,
              appointmentId,
              counterpartyName: appointment.docData?.name,
              note: `${percent}% back, ${reason}`,
            },
          ],
          { session: db },
        );
        done = true;
      });
    } finally {
      await db.endSession();
    }
    return done ? refund : null;
  }

  // --- care fund payouts ---

  /** Banks a withdrawal can go to (when Paystack is set up), for the patient's form. */
  async payoutOptions() {
    const banks = await this.paystack.banks();
    const rate = Number(process.env.PAYOUT_USD_NGN_RATE);
    return {
      success: true,
      paystack: this.paystack.configured && banks.length > 0,
      banks,
      fundCurrency: (process.env.CURRENCY || 'usd').toUpperCase(),
      ngnRate: Number.isFinite(rate) && rate > 0 ? rate : null,
    };
  }

  /** The account holder's name for a bank account, so the patient can confirm it. */
  async resolveAccount(body: { bankCode?: string; accountNumber?: string }) {
    const accountName = await this.paystack.resolveAccount(clean(body.accountNumber, 20), clean(body.bankCode, 20));
    return { success: true, accountName };
  }

  async requestPayout(
    userId: string,
    body: { cents?: number; accountName?: string; bankName?: string; bankCode?: string; accountNumber?: string; note?: string },
  ) {
    const settings = walletSettings();
    let accountName = clean(body.accountName, 120);
    let bankName = clean(body.bankName, 120);
    const accountNumber = clean(body.accountNumber, 40);
    const bankCode = clean(body.bankCode, 20);
    if (await this.payouts.exists({ userId, status: { $in: ['pending', 'processing'] } })) {
      fail('You already have a withdrawal in progress');
    }

    // With Paystack: the bank tells us whose account it is (never trust the form for that)
    let resolvedAccountName: string | undefined;
    if (this.paystack.configured && bankCode) {
      resolvedAccountName = await this.paystack.resolveAccount(accountNumber, bankCode);
      accountName = resolvedAccountName;
      bankName = (await this.paystack.banks()).find((b) => b.code === bankCode)?.name ?? bankName ?? bankCode;
    }
    if (!accountName || !bankName || !accountNumber) fail('Enter the account name, bank and account number');

    const wallet = await this.wallets.findOne({ userId });
    const available = wallet?.fundCents ?? 0;
    const cents = body.cents ? Math.floor(Number(body.cents)) : available;
    if (!cents || cents < settings.minPayoutCents) {
      fail(`The smallest withdrawal is $${(settings.minPayoutCents / 100).toFixed(2)}`);
    }
    if (cents > available) fail('That is more than your care fund holds');

    const user = await this.users.findById(userId).select(['name', 'email']);
    if (!user) fail('User not found', HttpStatus.NOT_FOUND);

    let payout: IPayout | undefined;
    const db = await this.connection.startSession();
    try {
      await db.withTransaction(async () => {
        // the amount is held (taken out of the fund) while the admin reviews it
        const held = await this.wallets.updateOne(
          { userId, fundCents: { $gte: cents } },
          { $inc: { fundCents: -cents } },
          { session: db },
        );
        if (!held.modifiedCount) fail('That is more than your care fund holds');
        [payout] = await this.payouts.create(
          [
            {
              userId,
              userName: user.name,
              userEmail: user.email,
              cents,
              accountName,
              bankName,
              accountNumber,
              note: clean(body.note, 500) || undefined,
              ...(resolvedAccountName && {
                provider: 'paystack',
                bankCode,
                resolvedAccountName,
                payoutCurrency: 'NGN',
                payoutMinor: toPayoutKobo(cents) ?? undefined,
              }),
            },
          ],
          { session: db },
        );
        await this.ledger.create(
          [{ userId, kind: 'payout_requested', cents: -cents, payoutId: String(payout!._id) }],
          { session: db },
        );
      });
    } finally {
      await db.endSession();
    }

    this.emails.payoutRequested(payout!);
    return { success: true, message: 'Withdrawal requested. The clinic will verify and send it.' };
  }

  async listPayouts(status?: string) {
    const known: IPayout['status'][] = ['pending', 'processing', 'paid', 'rejected', 'failed'];
    const filter: { status?: IPayout['status'] } = known.includes(status as IPayout['status'])
      ? { status: status as IPayout['status'] }
      : {};
    const payouts = await this.payouts.find(filter).sort({ status: 1, createdAt: -1 }).limit(200).lean();
    const rate = Number(process.env.PAYOUT_USD_NGN_RATE);
    return {
      success: true,
      paystack: this.paystack.configured,
      ngnRate: Number.isFinite(rate) && rate > 0 ? rate : null,
      // does the bank's account name share a name with the patient? (a quick check for the admin)
      payouts: payouts.map((p) => ({ ...p, nameMatches: p.resolvedAccountName ? namesMatch(p.resolvedAccountName, p.userName) : null })),
    };
  }

  /**
   * Admin: send it through Paystack. The payout is claimed first (pending → processing)
   * so it can't be sent twice; our payout id is the transfer reference, so Paystack
   * refuses a duplicate too. Success/failure arrives by webhook (or "check again").
   */
  async sendPayout(payoutId: string, body: { identityVerified?: boolean; adminNote?: string }) {
    if (!isValidObjectId(payoutId)) fail('Payout not found', HttpStatus.NOT_FOUND);
    if (body.identityVerified !== true) fail("Confirm you've verified the patient's identity first");
    const existing = await this.payouts.findById(payoutId).lean();
    if (!existing) fail('Payout not found', HttpStatus.NOT_FOUND);
    if (existing.provider !== 'paystack' || !existing.bankCode) fail('This withdrawal has no verified bank account; send it by hand');
    const kobo = existing.payoutMinor ?? toPayoutKobo(existing.cents);
    if (!kobo) fail('Set PAYOUT_USD_NGN_RATE so the amount can be converted to naira');

    const claimed = await this.payouts.findOneAndUpdate(
      { _id: payoutId, status: 'pending' },
      { $set: { status: 'processing', payoutMinor: kobo, adminNote: clean(body.adminNote, 500) || undefined } },
      { returnDocument: 'after' },
    );
    if (!claimed) fail('This withdrawal was already handled');

    try {
      const result = await this.paystack.transfer({
        name: claimed.resolvedAccountName ?? claimed.accountName,
        accountNumber: claimed.accountNumber,
        bankCode: claimed.bankCode!,
        amountKobo: kobo,
        reference: `payout-${claimed._id}`,
        reason: "ADJ's CODEs care fund",
      });
      await this.payouts.updateOne({ _id: claimed._id }, { $set: { transferCode: result.transferCode } });
      if (result.status === 'success') await this.completeTransfer(`payout-${claimed._id}`, 'success');
      if (result.status === 'otp') {
        await this.payouts.updateOne({ _id: claimed._id }, { $set: { status: 'pending' } });
        fail('Paystack wants an OTP for transfers. Turn off "Confirm transfers before sending" in the Paystack dashboard.');
      }
      return { success: true, message: result.status === 'success' ? 'Sent' : 'Sent to Paystack; waiting for the bank to confirm' };
    } catch (err) {
      // nothing went out: put it back so it can be retried or rejected
      await this.payouts.updateOne({ _id: claimed._id, status: 'processing', transferCode: { $exists: false } }, { $set: { status: 'pending' } });
      throw err;
    }
  }

  /** Admin: ask Paystack again where a processing transfer stands. */
  async refreshPayout(payoutId: string) {
    if (!isValidObjectId(payoutId)) fail('Payout not found', HttpStatus.NOT_FOUND);
    const payout = await this.payouts.findById(payoutId).lean();
    if (!payout || payout.status !== 'processing') return { success: true, message: 'Nothing to check' };
    const { status, reason } = await this.paystack.verify(`payout-${payout._id}`);
    if (status === 'success' || status === 'failed' || status === 'reversed') {
      await this.completeTransfer(`payout-${payout._id}`, status, reason);
    }
    return { success: true, message: `Paystack says: ${status}` };
  }

  /** A Paystack transfer finished (webhook or check). Failed/reversed money goes back to the fund. */
  async completeTransfer(reference: string, outcome: string, reason?: string) {
    const id = reference.startsWith('payout-') ? reference.slice(7) : '';
    if (!isValidObjectId(id)) return;

    if (outcome === 'success') {
      const payout = await this.payouts.findOneAndUpdate(
        { _id: id, status: 'processing' },
        { $set: { status: 'paid', reference: reference, decidedAt: new Date() } },
        { returnDocument: 'after' },
      );
      if (payout) this.emails.payoutDecided(payout);
      return;
    }
    if (outcome !== 'failed' && outcome !== 'reversed') return;

    let payout: IPayout | null = null;
    const db = await this.connection.startSession();
    try {
      await db.withTransaction(async () => {
        payout = await this.payouts.findOneAndUpdate(
          { _id: id, status: 'processing' },
          { $set: { status: 'failed', failureReason: clean(reason ?? outcome, 300), decidedAt: new Date() } },
          { returnDocument: 'after', session: db },
        );
        if (!payout) return;
        await this.wallets.updateOne({ userId: payout.userId }, { $inc: { fundCents: payout.cents } }, { session: db });
        await this.ledger.create(
          [{ userId: payout.userId, kind: 'payout_returned', cents: payout.cents, payoutId: String(payout._id), note: `transfer ${outcome}` }],
          { session: db },
        );
      });
    } finally {
      await db.endSession();
    }
    if (payout) this.emails.payoutDecided(payout);
  }

  /** Admin: money has been sent by bank transfer; record the reference. */
  async markPayoutPaid(payoutId: string, body: { reference?: string; identityVerified?: boolean; adminNote?: string }) {
    if (!isValidObjectId(payoutId)) fail('Payout not found', HttpStatus.NOT_FOUND);
    if (body.identityVerified !== true) fail("Confirm you've verified the patient's identity first");
    const reference = clean(body.reference, 120);
    if (!reference) fail('Enter the transfer reference');

    const payout = await this.payouts.findOneAndUpdate(
      { _id: payoutId, status: 'pending' },
      { $set: { status: 'paid', reference, adminNote: clean(body.adminNote, 500) || undefined, decidedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!payout) fail('This withdrawal was already handled');
    this.emails.payoutDecided(payout);
    return { success: true, message: 'Marked as paid' };
  }

  /** Admin: refuse it; the held amount goes back into the care fund. */
  async rejectPayout(payoutId: string, body: { adminNote?: string }) {
    if (!isValidObjectId(payoutId)) fail('Payout not found', HttpStatus.NOT_FOUND);
    const adminNote = clean(body.adminNote, 500);
    if (!adminNote) fail('Give the patient a reason');

    let payout: IPayout | null = null;
    const db = await this.connection.startSession();
    try {
      await db.withTransaction(async () => {
        payout = await this.payouts.findOneAndUpdate(
          { _id: payoutId, status: 'pending' },
          { $set: { status: 'rejected', adminNote, decidedAt: new Date() } },
          { returnDocument: 'after', session: db },
        );
        if (!payout) fail('This withdrawal was already handled');
        await this.wallets.updateOne({ userId: payout.userId }, { $inc: { fundCents: payout.cents } }, { session: db });
        await this.ledger.create(
          [{ userId: payout.userId, kind: 'payout_returned', cents: payout.cents, payoutId: String(payout._id), note: adminNote }],
          { session: db },
        );
      });
    } finally {
      await db.endSession();
    }
    this.emails.payoutDecided(payout!);
    return { success: true, message: 'Rejected; the amount went back to their care fund' };
  }
}
