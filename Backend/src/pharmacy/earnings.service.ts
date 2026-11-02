import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model, Types } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IPharmacy, IPharmacyPayout, PharmacyPayoutStatus } from '../database/schemas/pharmacy.schemas';
import type { IShopOrder } from '../database/schemas/shop-order.schema';
import { EmailNotifications } from '../notifications/email-notifications';
import { PaystackService, toPayoutKobo } from '../payments/paystack.service';
import type { StaffContext } from './pharmacy.auth';

const HOLD_MS = 24 * 60 * 60_000; // earnings wait a day after delivery, in case something went wrong
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const minPayoutCents = () => {
  const n = Number(process.env.PHARMACY_PAYOUT_MIN_CENTS ?? 1000);
  return Number.isInteger(n) && n > 0 ? n : 1000;
};
const REFERENCE_PREFIX = 'pharmacy-payout-';
// aggregation $match doesn't cast strings to ObjectIds the way find() does
const asId = (id: Types.ObjectId | string) => (typeof id === 'string' ? new Types.ObjectId(id) : id);

const payoutView = (p: IPharmacyPayout) => ({
  _id: String(p._id),
  pharmacyId: String(p.pharmacyId),
  pharmacyName: p.pharmacyName,
  cents: p.cents,
  bank: { bankName: p.bank.bankName, accountName: p.bank.accountName, accountNumber: p.bank.accountNumber, verified: p.bank.verified },
  requestedBy: p.requestedBy?.name,
  status: p.status,
  provider: p.provider,
  payoutMinor: p.payoutMinor,
  reference: p.reference,
  failureReason: p.failureReason,
  adminNote: p.adminNote,
  decidedAt: p.decidedAt,
  createdAt: p.createdAt,
});

/**
 * What pharmacies have earned and withdrawn. The balance is always worked out from the
 * orders (delivered, minus commission) and the withdrawals, never kept as a running number.
 */
@Injectable()
export class PharmacyEarningsService {
  constructor(
    @InjectModel(MODEL.shopOrder) private readonly orders: Model<IShopOrder>,
    @InjectModel(MODEL.pharmacy) private readonly pharmacies: Model<IPharmacy>,
    @InjectModel(MODEL.pharmacyPayout) private readonly payouts: Model<IPharmacyPayout>,
    private readonly paystack: PaystackService,
    private readonly emails: EmailNotifications,
  ) {}

  /** available: can be withdrawn now; waiting: delivered in the last 24h; held: in an open withdrawal. */
  async balance(pharmacyId: Types.ObjectId | string) {
    const cutoff = new Date(Date.now() - HOLD_MS);
    const [earned] = await this.orders.aggregate<{ ready: number; waiting: number; orders: number }>([
      { $match: { pharmacyId: asId(pharmacyId), status: 'delivered' } },
      {
        $group: {
          _id: null,
          ready: { $sum: { $cond: [{ $lte: ['$deliveredAt', cutoff] }, '$pharmacyEarningCents', 0] } },
          waiting: { $sum: { $cond: [{ $gt: ['$deliveredAt', cutoff] }, '$pharmacyEarningCents', 0] } },
          orders: { $sum: 1 },
        },
      },
    ]);
    const paid = await this.payouts.aggregate<{ _id: PharmacyPayoutStatus; cents: number }>([
      { $match: { pharmacyId: asId(pharmacyId), status: { $in: ['pending', 'processing', 'paid'] } } },
      { $group: { _id: '$status', cents: { $sum: '$cents' } } },
    ]);
    const sum = (...s: PharmacyPayoutStatus[]) => paid.filter((p) => s.includes(p._id)).reduce((n, p) => n + p.cents, 0);
    return {
      availableCents: Math.max(0, (earned?.ready ?? 0) - sum('pending', 'processing', 'paid')),
      waitingCents: earned?.waiting ?? 0,
      inWithdrawalCents: sum('pending', 'processing'),
      paidOutCents: sum('paid'),
      deliveredOrders: earned?.orders ?? 0,
    };
  }

  // --- the pharmacy (owner) ---

  async overview({ pharmacy }: StaffContext) {
    const [balance, payouts, recent] = await Promise.all([
      this.balance(pharmacy._id as Types.ObjectId),
      this.payouts.find({ pharmacyId: pharmacy._id }).sort({ createdAt: -1 }).limit(50),
      this.orders
        .find({ pharmacyId: pharmacy._id, status: 'delivered' })
        .select(['patientName', 'totalCents', 'commissionCents', 'commissionPercent', 'pharmacyEarningCents', 'deliveredAt'])
        .sort({ deliveredAt: -1 })
        .limit(50)
        .lean(),
    ]);
    return {
      success: true,
      ...balance,
      minPayoutCents: minPayoutCents(),
      holdHours: HOLD_MS / 3_600_000,
      bank: pharmacy.payoutBank ?? null,
      payouts: payouts.map(payoutView),
      orders: recent.map((o) => ({
        _id: String(o._id),
        patientName: o.patientName,
        totalCents: o.totalCents,
        commissionCents: o.commissionCents,
        commissionPercent: o.commissionPercent,
        earningCents: o.pharmacyEarningCents,
        deliveredAt: o.deliveredAt,
        ready: !!o.deliveredAt && o.deliveredAt.getTime() <= Date.now() - HOLD_MS,
      })),
    };
  }

  async bankOptions() {
    const banks = await this.paystack.banks();
    return { success: true, paystack: this.paystack.configured && banks.length > 0, banks };
  }

  /** Where withdrawals go. With Paystack the bank confirms the account name; without it, typed in. */
  async saveBank({ pharmacy }: StaffContext, body: { bankCode?: string; bankName?: string; accountNumber?: string; accountName?: string }) {
    const accountNumber = clean(body.accountNumber, 20);
    let bank: NonNullable<IPharmacy['payoutBank']>;
    if (this.paystack.configured && body.bankCode) {
      const bankCode = clean(body.bankCode, 20);
      const accountName = await this.paystack.resolveAccount(accountNumber, bankCode);
      const bankName = (await this.paystack.banks()).find((b) => b.code === bankCode)?.name ?? clean(body.bankName, 120);
      bank = { bankName: bankName || bankCode, bankCode, accountNumber, accountName, verified: true };
    } else {
      const bankName = clean(body.bankName, 120);
      const accountName = clean(body.accountName, 120);
      if (!bankName || !accountName || !accountNumber) fail('Enter the bank, account name and account number');
      bank = { bankName, accountNumber, accountName, verified: false };
    }
    await this.pharmacies.updateOne({ _id: pharmacy._id }, { $set: { payoutBank: bank } });
    return { success: true, message: bank.verified ? `Saved: the bank says this account belongs to ${bank.accountName}` : 'Saved', bank };
  }

  /** Withdraw what's available (or part of it). One open withdrawal at a time. */
  async requestPayout({ staff, pharmacy }: StaffContext, body: { cents?: number }) {
    if (pharmacy.status !== 'approved') fail('Your pharmacy must be approved to withdraw');
    const bank = pharmacy.payoutBank;
    if (!bank) fail('Add the bank account to pay into first');
    const { availableCents } = await this.balance(pharmacy._id as Types.ObjectId);
    const cents = body.cents ? Math.floor(Number(body.cents)) : availableCents;
    if (!Number.isFinite(cents) || cents < minPayoutCents()) fail(`The smallest withdrawal is $${(minPayoutCents() / 100).toFixed(2)}`);
    if (cents > availableCents) fail(`You can withdraw up to $${(availableCents / 100).toFixed(2)} right now`);

    let payout: IPharmacyPayout;
    try {
      payout = await this.payouts.create({
        pharmacyId: pharmacy._id,
        pharmacyName: pharmacy.name,
        cents,
        bank,
        requestedBy: { staffId: String(staff._id), name: staff.name },
        status: 'pending',
        open: true,
        provider: bank.verified && bank.bankCode ? 'paystack' : 'manual',
        payoutMinor: toPayoutKobo(cents) ?? undefined,
      });
    } catch (err: any) {
      // the unique "one open withdrawal" index: two requests at once can't both get through
      if (err?.code === 11000) fail('You already have a withdrawal in progress');
      throw err;
    }
    this.emails.pharmacyPayoutRequested(payout);
    return { success: true, message: "Withdrawal requested. We'll email you when it's sent.", payout: payoutView(payout) };
  }

  // --- the admin ---

  async adminList(status?: string) {
    const known: PharmacyPayoutStatus[] = ['pending', 'processing', 'paid', 'rejected', 'failed'];
    const filter: { status?: PharmacyPayoutStatus } = known.includes(status as PharmacyPayoutStatus) ? { status: status as PharmacyPayoutStatus } : {};
    const payouts = await this.payouts.find(filter).sort({ createdAt: -1 }).limit(200);
    const rate = Number(process.env.PAYOUT_USD_NGN_RATE);
    return {
      success: true,
      paystack: this.paystack.configured,
      ngnRate: Number.isFinite(rate) && rate > 0 ? rate : null,
      payouts: payouts.map(payoutView),
    };
  }

  /** Send through Paystack: claimed first (pending -> processing) so it can't go twice. */
  async send(payoutId: string, body: { adminNote?: string }) {
    const existing = await this.find(payoutId);
    if (existing.provider !== 'paystack' || !existing.bank.bankCode) fail('This account was not confirmed by the bank; send it by hand');
    const kobo = existing.payoutMinor ?? toPayoutKobo(existing.cents);
    if (!kobo) fail('Set PAYOUT_USD_NGN_RATE so the amount can be converted to naira');

    const claimed = await this.payouts.findOneAndUpdate(
      { _id: existing._id, status: 'pending' },
      { $set: { status: 'processing', payoutMinor: kobo, adminNote: clean(body.adminNote, 500) || undefined } },
      { returnDocument: 'after' },
    );
    if (!claimed) fail('This withdrawal was already handled');
    const reference = `${REFERENCE_PREFIX}${claimed._id}`;
    try {
      const result = await this.paystack.transfer({
        name: claimed.bank.accountName,
        accountNumber: claimed.bank.accountNumber,
        bankCode: claimed.bank.bankCode!,
        amountKobo: kobo,
        reference,
        reason: `ADJ's CODEs pharmacy earnings`,
      });
      await this.payouts.updateOne({ _id: claimed._id }, { $set: { transferCode: result.transferCode } });
      if (result.status === 'success') await this.completeTransfer(reference, 'success');
      if (result.status === 'otp') {
        await this.payouts.updateOne({ _id: claimed._id }, { $set: { status: 'pending' } });
        fail('Paystack wants an OTP for transfers. Turn off "Confirm transfers before sending" in the Paystack dashboard.');
      }
      return { success: true, message: result.status === 'success' ? 'Sent' : 'Sent to Paystack; waiting for the bank to confirm' };
    } catch (err) {
      await this.payouts.updateOne({ _id: claimed._id, status: 'processing', transferCode: { $exists: false } }, { $set: { status: 'pending' } });
      throw err;
    }
  }

  async markPaid(payoutId: string, body: { reference?: string; adminNote?: string }) {
    const reference = clean(body.reference, 120);
    if (!reference) fail('Enter the transfer reference');
    const existing = await this.find(payoutId);
    const paid = await this.payouts.findOneAndUpdate(
      { _id: existing._id, status: 'pending' },
      { $set: { status: 'paid', reference, adminNote: clean(body.adminNote, 500) || undefined, decidedAt: new Date() }, $unset: { open: 1 } },
      { returnDocument: 'after' },
    );
    if (!paid) fail('This withdrawal was already handled');
    this.emails.pharmacyPayoutDecided(paid, await this.pharmacyEmail(paid));
    return { success: true, message: 'Marked as paid' };
  }

  async reject(payoutId: string, body: { adminNote?: string }) {
    const adminNote = clean(body.adminNote, 500);
    if (!adminNote) fail('Give the pharmacy a reason');
    const existing = await this.find(payoutId);
    const rejected = await this.payouts.findOneAndUpdate(
      { _id: existing._id, status: 'pending' },
      { $set: { status: 'rejected', adminNote, decidedAt: new Date() }, $unset: { open: 1 } },
      { returnDocument: 'after' },
    );
    if (!rejected) fail('This withdrawal was already handled');
    this.emails.pharmacyPayoutDecided(rejected, await this.pharmacyEmail(rejected));
    return { success: true, message: 'Rejected; the amount is back in their balance' };
  }

  async refresh(payoutId: string) {
    const payout = await this.find(payoutId);
    if (payout.status !== 'processing') return { success: true, message: 'Nothing to check' };
    const { status, reason } = await this.paystack.verify(`${REFERENCE_PREFIX}${payout._id}`);
    if (['success', 'failed', 'reversed'].includes(status)) await this.completeTransfer(`${REFERENCE_PREFIX}${payout._id}`, status, reason);
    return { success: true, message: `Paystack says: ${status}` };
  }

  /** Paystack finished a transfer (webhook or "check again"). Failed ones count in the balance again. */
  async completeTransfer(reference: string, outcome: string, reason?: string) {
    const id = reference.startsWith(REFERENCE_PREFIX) ? reference.slice(REFERENCE_PREFIX.length) : '';
    if (!isValidObjectId(id)) return;
    const done =
      outcome === 'success'
        ? await this.payouts.findOneAndUpdate(
            { _id: id, status: 'processing' },
            { $set: { status: 'paid', reference, decidedAt: new Date() }, $unset: { open: 1 } },
            { returnDocument: 'after' },
          )
        : outcome === 'failed' || outcome === 'reversed'
          ? await this.payouts.findOneAndUpdate(
              { _id: id, status: 'processing' },
              { $set: { status: 'failed', failureReason: clean(reason ?? outcome, 300), decidedAt: new Date() }, $unset: { open: 1 } },
              { returnDocument: 'after' },
            )
          : null;
    if (done) this.emails.pharmacyPayoutDecided(done, await this.pharmacyEmail(done));
  }

  static isOurReference(reference: string) {
    return reference.startsWith(REFERENCE_PREFIX);
  }

  private async find(payoutId: string) {
    if (!isValidObjectId(payoutId)) fail('Withdrawal not found', HttpStatus.NOT_FOUND);
    const payout = await this.payouts.findById(payoutId);
    if (!payout) fail('Withdrawal not found', HttpStatus.NOT_FOUND);
    return payout;
  }

  private async pharmacyEmail(p: IPharmacyPayout) {
    return (await this.pharmacies.findById(p.pharmacyId).select('email').lean())?.email;
  }
}
