import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, PipelineStage } from 'mongoose';
import { NOT_A_HOLD } from '../appointments/booking.service';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IDoctorPayout } from '../database/schemas/doctor-payout.schema';
import type { IPharmacyPayout } from '../database/schemas/pharmacy.schemas';
import { type IShopOrder, OPEN_ORDER } from '../database/schemas/shop-order.schema';
import type { IPayout, IWallet, IWalletTransaction } from '../database/schemas/wallet.schemas';

const DAY = 24 * 60 * 60_000;
const PERIODS = [30, 90, 365, 0] as const; // 0 = all time

type Bucket = 'day' | 'week' | 'month';

/**
 * The admin's money overview. Everything is in cents:
 *  - appointment fees (by card / wallet / older payments) and what each doctor earned
 *  - coins sold (cash through Stripe) and the clinic's cut of gifts (the gift fee)
 *  - refunds sent, and the ones still waiting for someone to act
 *  - what the clinic owes right now: unspent coins, care funds, payouts in progress
 * Wallet-paid visits were paid with coins or gift money, so they're already in "coins sold";
 * "cash in" only counts money that actually came through Stripe.
 */
@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    @InjectModel(MODEL.wallet) private readonly wallets: Model<IWallet>,
    @InjectModel(MODEL.walletTransaction) private readonly ledger: Model<IWalletTransaction>,
    @InjectModel(MODEL.payout) private readonly payouts: Model<IPayout>,
    @InjectModel(MODEL.shopOrder) private readonly shopOrders: Model<IShopOrder>,
    @InjectModel(MODEL.pharmacyPayout) private readonly pharmacyPayouts: Model<IPharmacyPayout>,
    @InjectModel(MODEL.doctorPayout) private readonly doctorPayouts: Model<IDoctorPayout>,
  ) {}

  async overview(daysParam?: string) {
    const days = PERIODS.find((p) => String(p) === daysParam) ?? 30;
    const since = days ? new Date(Date.now() - days * DAY) : new Date(0);
    const bucket: Bucket = days === 30 ? 'day' : days === 90 ? 'week' : 'month';

    const paid = { ...NOT_A_HOLD, payment: true, date: { $gte: since.getTime() } };
    const [visits, doctors, ledger, refunds, owed, payouts, attention, trend, shop, docWallets] = await Promise.all([
      this.visitTotals(paid),
      this.doctorEarnings(paid),
      this.ledgerTotals(since),
      this.refundTotals(since),
      this.owedNow(),
      this.payoutTotals(since),
      this.needsAttention(),
      this.trend(since, bucket, paid),
      this.shopTotals(since),
      this.doctorWalletTotals(since),
    ]);

    const cardCents = visits.card + visits.legacy;
    return {
      success: true,
      days,
      bucket,
      currency: (process.env.CURRENCY || 'usd').toUpperCase(),
      summary: {
        cashInCents: cardCents + ledger.coinSalesCents + shop.cardCents,
        appointmentFeesCents: visits.card + visits.wallet + visits.legacy,
        paidVisits: visits.count,
        byMethod: { cardCents: visits.card, walletCents: visits.wallet, olderCents: visits.legacy },
        coinSalesCents: ledger.coinSalesCents,
        coinsSold: ledger.coinsSold,
        giftCoins: ledger.giftCoins,
        giftFeeCents: ledger.giftCoins - ledger.giftToFundsCents,
        giftToFundsCents: ledger.giftToFundsCents,
        refundedCents: refunds.refundedCents,
        refundCount: refunds.count,
        payoutsPaidCents: payouts.paidCents,
        payoutsPaidCount: payouts.paidCount,
      },
      owed: {
        ...owed,
        pharmaciesCents: shop.owedToPharmaciesCents,
        ordersInProgressCents: shop.inProgressCents,
        doctorsCents: docWallets.owedToDoctorsCents,
        totalCents: owed.totalCents + shop.owedToPharmaciesCents + shop.inProgressCents + docWallets.owedToDoctorsCents,
      },
      doctorWallets: {
        commissionCents: docWallets.commissionCents,
        payoutsPaidCents: docWallets.payoutsPaidCents,
      },
      shop: {
        ordersCents: shop.ordersCents,
        orders: shop.orders,
        deliveredOrders: shop.deliveredOrders,
        commissionCents: shop.commissionCents,
        refundedCents: shop.refundedCents,
        pharmacyPayoutsPaidCents: shop.payoutsPaidCents,
      },
      doctors,
      attention: {
        ...attention,
        pendingPharmacyPayouts: shop.pendingPayouts,
        failedOrderRefunds: shop.failedRefunds,
        pendingDoctorPayouts: docWallets.pendingPayouts,
      },
      trend,
    };
  }

  /** Paid visits in the period, split by how they were paid ($ amounts → cents). */
  private async visitTotals(match: object) {
    const rows = await this.appointments.aggregate<{ _id: string | null; cents: number; count: number }>([
      { $match: match },
      { $group: { _id: '$paymentMethod', cents: { $sum: { $multiply: ['$amount', 100] } }, count: { $sum: 1 } } },
    ]);
    const by = (m: string | null) => Math.round(rows.find((r) => (r._id ?? null) === m)?.cents ?? 0);
    return {
      card: by('stripe'),
      wallet: by('wallet'),
      // paid before payment methods were recorded: those all went through Stripe
      legacy: by(null),
      count: rows.reduce((n, r) => n + r.count, 0),
    };
  }

  /** Per doctor: fees from paid visits, minus whatever was refunded on them. */
  private async doctorEarnings(match: object) {
    const rows = await this.appointments.aggregate<{
      _id: string;
      name: string;
      speciality?: string;
      visits: number;
      grossCents: number;
      refundCents: number;
      missedByDoctor: number;
      noShows: number;
      commissionCents: number;
    }>([
      // a cancelled visit earns the doctor nothing (its refund is listed under "needs attention" if it's missing)
      { $match: { ...match, cancelled: { $ne: true } } },
      {
        $group: {
          _id: '$docId',
          name: { $last: '$docData.name' },
          speciality: { $last: '$docData.speciality' },
          visits: { $sum: 1 },
          grossCents: { $sum: { $multiply: ['$amount', 100] } },
          refundCents: {
            $sum: { $cond: [{ $eq: ['$refund.status', 'refunded'] }, { $multiply: ['$refund.amount', 100] }, 0] },
          },
          missedByDoctor: { $sum: { $cond: [{ $eq: ['$missed.by', 'doctor'] }, 1, 0] } },
          noShows: { $sum: { $cond: [{ $eq: ['$missed.by', 'patient'] }, 1, 0] } },
          commissionCents: { $sum: { $ifNull: ['$earning.commissionCents', 0] } },
        },
      },
      { $sort: { grossCents: -1 } },
      { $limit: 100 },
    ]);
    return rows.map(({ _id, ...r }) => ({
      docId: _id,
      ...r,
      grossCents: Math.round(r.grossCents),
      refundCents: Math.round(r.refundCents),
      netCents: Math.round(r.grossCents - r.refundCents),
    }));
  }

  /** Coin sales and gifts from the wallet ledger. 1 coin = 1 cent. */
  private async ledgerTotals(since: Date) {
    const rows = await this.ledger.aggregate<{ _id: string; coins: number; cents: number }>([
      { $match: { kind: { $in: ['topup', 'gift_sent', 'gift_received'] }, createdAt: { $gte: since } } },
      { $group: { _id: '$kind', coins: { $sum: '$coins' }, cents: { $sum: '$cents' } } },
    ]);
    const row = (k: string) => rows.find((r) => r._id === k);
    return {
      coinSalesCents: row('topup')?.cents ?? 0,
      coinsSold: row('topup')?.coins ?? 0,
      // gift_sent coins are negative (they leave the sender)
      giftCoins: -(row('gift_sent')?.coins ?? 0),
      giftToFundsCents: row('gift_received')?.cents ?? 0,
    };
  }

  private async refundTotals(since: Date) {
    const [row] = await this.appointments.aggregate<{ cents: number; count: number }>([
      { $match: { 'refund.status': 'refunded', 'refund.at': { $gte: since } } },
      { $group: { _id: null, cents: { $sum: { $multiply: ['$refund.amount', 100] } }, count: { $sum: 1 } } },
    ]);
    return { refundedCents: Math.round(row?.cents ?? 0), count: row?.count ?? 0 };
  }

  /** What the clinic is holding for people right now (not tied to the period). */
  private async owedNow() {
    const [[wallets], [held]] = await Promise.all([
      this.wallets.aggregate<{ coins: number; fundCents: number; funds: number }>([
        {
          $group: {
            _id: null,
            coins: { $sum: '$coins' },
            fundCents: { $sum: '$fundCents' },
            funds: { $sum: { $cond: [{ $gt: ['$fundCents', 0] }, 1, 0] } },
          },
        },
      ]),
      this.payouts.aggregate<{ cents: number; count: number }>([
        { $match: { status: { $in: ['pending', 'processing'] } } },
        { $group: { _id: null, cents: { $sum: '$cents' }, count: { $sum: 1 } } },
      ]),
    ]);
    const careFundsCents = wallets?.fundCents ?? 0;
    const payoutsHeldCents = held?.cents ?? 0;
    return {
      unspentCoins: wallets?.coins ?? 0,
      careFundsCents,
      careFundCount: wallets?.funds ?? 0,
      payoutsHeldCents,
      payoutsHeldCount: held?.count ?? 0,
      // coins count at face value (a pack's bonus coins make this a little more than was paid)
      totalCents: (wallets?.coins ?? 0) + careFundsCents + payoutsHeldCents,
    };
  }

  private async payoutTotals(since: Date) {
    const [row] = await this.payouts.aggregate<{ cents: number; count: number }>([
      { $match: { status: 'paid', decidedAt: { $gte: since } } },
      { $group: { _id: null, cents: { $sum: '$cents' }, count: { $sum: 1 } } },
    ]);
    return { paidCents: row?.cents ?? 0, paidCount: row?.count ?? 0 };
  }

  /**
   * The medicine shop. Orders count once paid (card ones are cash in; wallet ones were already
   * counted as coins/gifts). Commission is earned on delivery. What the clinic still holds:
   * pharmacies' earned-but-not-withdrawn money, and paid orders still on their way.
   */
  private async shopTotals(since: Date) {
    const paidOrders = { 'payment.paid': true, createdAt: { $gte: since } };
    const [[orders], [delivered], [refunded], [earned], [withdrawn], [inProgress], payoutsPaid, pendingPayouts, failedRefunds] = await Promise.all([
      this.shopOrders.aggregate<{ cents: number; card: number; n: number }>([
        { $match: paidOrders },
        {
          $group: {
            _id: null,
            cents: { $sum: '$totalCents' },
            card: { $sum: { $cond: [{ $eq: ['$payment.method', 'stripe'] }, '$totalCents', 0] } },
            n: { $sum: 1 },
          },
        },
      ]),
      this.shopOrders.aggregate<{ commission: number; n: number }>([
        { $match: { status: 'delivered', deliveredAt: { $gte: since } } },
        { $group: { _id: null, commission: { $sum: '$commissionCents' }, n: { $sum: 1 } } },
      ]),
      this.shopOrders.aggregate<{ cents: number }>([
        { $match: { 'refund.status': 'refunded', 'refund.at': { $gte: since } } },
        { $group: { _id: null, cents: { $sum: '$refund.cents' } } },
      ]),
      // all time: what pharmacies have earned vs what has gone (or is going) to them
      this.shopOrders.aggregate<{ cents: number }>([{ $match: { status: 'delivered' } }, { $group: { _id: null, cents: { $sum: '$pharmacyEarningCents' } } }]),
      this.pharmacyPayouts.aggregate<{ cents: number }>([{ $match: { status: 'paid' } }, { $group: { _id: null, cents: { $sum: '$cents' } } }]),
      this.shopOrders.aggregate<{ cents: number }>([
        { $match: { status: { $in: OPEN_ORDER }, 'payment.paid': true } },
        { $group: { _id: null, cents: { $sum: '$totalCents' } } },
      ]),
      this.pharmacyPayouts.aggregate<{ cents: number }>([
        { $match: { status: 'paid', decidedAt: { $gte: since } } },
        { $group: { _id: null, cents: { $sum: '$cents' } } },
      ]),
      this.pharmacyPayouts.countDocuments({ status: 'pending' }),
      this.shopOrders.countDocuments({ 'refund.status': 'failed' }),
    ]);
    return {
      ordersCents: orders?.cents ?? 0,
      cardCents: orders?.card ?? 0,
      orders: orders?.n ?? 0,
      deliveredOrders: delivered?.n ?? 0,
      commissionCents: delivered?.commission ?? 0,
      refundedCents: refunded?.cents ?? 0,
      // earned on delivered orders minus what has actually been sent (open withdrawals are still owed)
      owedToPharmaciesCents: Math.max(0, (earned?.cents ?? 0) - (withdrawn?.cents ?? 0)),
      inProgressCents: inProgress?.cents ?? 0,
      payoutsPaidCents: payoutsPaid[0]?.cents ?? 0,
      pendingPayouts,
      failedRefunds,
    };
  }

  /**
   * Doctors' wallets. Each settled visit records what it earned the doctor and the clinic's
   * commission (`earning`); visits from before that are recorded the first time the doctor
   * opens their wallet. Owed = earned minus withdrawals already sent.
   */
  private async doctorWalletTotals(since: Date) {
    const [[period], [earned], [withdrawn], [paidOut], pendingPayouts] = await Promise.all([
      this.appointments.aggregate<{ commission: number }>([
        { $match: { 'earning.at': { $gte: since } } },
        { $group: { _id: null, commission: { $sum: '$earning.commissionCents' } } },
      ]),
      this.appointments.aggregate<{ cents: number }>([
        { $match: { 'earning.at': { $exists: true } } },
        { $group: { _id: null, cents: { $sum: '$earning.doctorCents' } } },
      ]),
      this.doctorPayouts.aggregate<{ cents: number }>([{ $match: { status: 'paid' } }, { $group: { _id: null, cents: { $sum: '$cents' } } }]),
      this.doctorPayouts.aggregate<{ cents: number }>([
        { $match: { status: 'paid', decidedAt: { $gte: since } } },
        { $group: { _id: null, cents: { $sum: '$cents' } } },
      ]),
      this.doctorPayouts.countDocuments({ status: 'pending' }),
    ]);
    return {
      commissionCents: period?.commission ?? 0,
      owedToDoctorsCents: Math.max(0, (earned?.cents ?? 0) - (withdrawn?.cents ?? 0)),
      payoutsPaidCents: paidOut?.cents ?? 0,
      pendingPayouts,
    };
  }

  /** Money that needs someone to do something. */
  private async needsAttention() {
    const pick = ['_id', 'userData.name', 'docData.name', 'slotDate', 'amount', 'refund', 'paymentMethod'];
    const [refunds, unrefunded, payouts] = await Promise.all([
      // refunds Stripe couldn't do, or older payments with no Stripe reference
      this.appointments.find({ 'refund.status': { $in: ['manual', 'failed'] } }).select(pick).sort({ 'refund.at': -1 }).limit(50).lean(),
      // cancelled after paying by card, and no refund on record
      this.appointments
        .find({ ...NOT_A_HOLD, cancelled: true, payment: true, paymentMethod: { $ne: 'wallet' }, refund: { $exists: false } })
        .select(pick)
        .sort({ date: -1 })
        .limit(50)
        .lean(),
      this.payouts.countDocuments({ status: 'pending' }),
    ]);
    const row = (a: any, why: string) => ({
      appointmentId: String(a._id),
      patient: a.userData?.name ?? 'Patient',
      doctor: a.docData?.name ?? 'Doctor',
      slotDate: a.slotDate,
      cents: Math.round((a.refund?.amount ?? a.amount) * 100),
      why,
    });
    return {
      pendingPayouts: payouts,
      refunds: [
        ...refunds.map((a: any) =>
          row(a, a.refund.status === 'failed' ? `Refund failed: ${a.refund.error ?? 'no reason given'}` : 'Refund by hand (paid before card references were saved)'),
        ),
        ...unrefunded.map((a) => row(a, 'Cancelled after paying by card; no refund recorded')),
      ],
    };
  }

  /** Card + older appointment fees and coin sales per day / week / month, for the chart. */
  private async trend(since: Date, unit: Bucket, paid: object) {
    const tz = process.env.APP_TIMEZONE || 'Africa/Lagos';
    // each bucket is keyed by its first day in the clinic's time zone, e.g. "2026-11-01"
    const group = (dateExpr: object | string, cents: object | string): PipelineStage[] => [
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              timezone: tz,
              date: { $dateTrunc: { date: dateExpr, unit, timezone: tz, ...(unit === 'week' ? { startOfWeek: 'monday' } : {}) } },
            },
          },
          cents: { $sum: cents },
        },
      },
    ];
    const [visits, coins] = await Promise.all([
      this.appointments.aggregate<{ _id: string; cents: number }>([
        { $match: { ...paid, paymentMethod: { $ne: 'wallet' } } },
        ...group({ $toDate: '$date' }, { $multiply: ['$amount', 100] }),
      ]),
      this.ledger.aggregate<{ _id: string; cents: number }>([
        { $match: { kind: 'topup', createdAt: { $gte: since } } },
        ...group('$createdAt', '$cents'),
      ]),
    ]);

    // every bucket from the start of the period to today, so quiet days show as zero
    const found = [...visits, ...coins].map((r) => r._id).sort();
    const first = since.getTime() > 0 ? bucketStart(localDay(since, tz), unit) : found[0];
    const points = new Map<string, { at: string; appointmentsCents: number; coinsCents: number }>();
    if (first) {
      const today = localDay(new Date(), tz);
      for (let at = first; at <= today && points.size < 400; at = nextBucket(at, unit)) {
        points.set(at, { at, appointmentsCents: 0, coinsCents: 0 });
      }
    }
    for (const v of visits) {
      const point = points.get(v._id);
      if (point) point.appointmentsCents = Math.round(v.cents);
    }
    for (const c of coins) {
      const point = points.get(c._id);
      if (point) point.coinsCents = Math.round(c.cents);
    }
    return [...points.values()];
  }
}

/** "YYYY-MM-DD" for an instant, in a time zone. */
function localDay(at: Date, tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

// calendar-date arithmetic on "YYYY-MM-DD" (UTC is only used as a neutral calendar here)
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (d: Date) => d.toISOString().slice(0, 10);

function bucketStart(day: string, unit: Bucket) {
  const d = toDate(day);
  if (unit === 'week') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
  if (unit === 'month') d.setUTCDate(1);
  return toDay(d);
}

function nextBucket(day: string, unit: Bucket) {
  const d = toDate(day);
  if (unit === 'day') d.setUTCDate(d.getUTCDate() + 1);
  if (unit === 'week') d.setUTCDate(d.getUTCDate() + 7);
  if (unit === 'month') d.setUTCMonth(d.getUTCMonth() + 1);
  return toDay(d);
}
