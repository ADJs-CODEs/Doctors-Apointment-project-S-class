import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model, Types } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { DoctorPayoutStatus, IDoctorPayout, IPlatformSetting } from '../database/schemas/doctor-payout.schema';
import type { IDoctor } from '../database/schemas/doctor.schema';
import { slotInstant } from '../notifications/clinic-time';
import { EmailNotifications } from '../notifications/email-notifications';
import { PaystackService, toPayoutKobo } from '../payments/paystack.service';

const HOLD_MS = 7 * 24 * 60 * 60_000; // earnings wait a week after the visit is settled
const DEFAULT_COMMISSION = 10;
const COMMISSION_KEY = 'doctorCommissionPercent';
const REFERENCE_PREFIX = 'doctor-payout-';
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const minPayoutCents = () => {
  const n = Number(process.env.DOCTOR_PAYOUT_MIN_CENTS ?? 1000);
  return Number.isInteger(n) && n > 0 ? n : 1000;
};

/** Paid, not cancelled, and either completed or a patient no-show (the doctor keeps what wasn't refunded). */
const SETTLED = {
  payment: true,
  cancelled: { $ne: true },
  $or: [{ isCompleted: true }, { 'missed.by': 'patient' as const }],
};

const payoutView = (p: IDoctorPayout) => ({
  _id: String(p._id),
  docId: String(p.docId),
  doctorName: p.doctorName,
  cents: p.cents,
  bank: { bankName: p.bank.bankName, accountName: p.bank.accountName, accountNumber: p.bank.accountNumber, verified: p.bank.verified },
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
 * What doctors have earned from visits and withdrawn. Each settled visit records its own
 * earning once (fee - refund - the clinic's commission at that moment), so changing the
 * commission later never rewrites the past. The balance is always worked out from those
 * records and the withdrawals, never kept as a running number.
 */
@Injectable()
export class DoctorEarningsService {
  private commissionCache?: { at: number; percent: number };

  constructor(
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.doctorPayout) private readonly payouts: Model<IDoctorPayout>,
    @InjectModel(MODEL.platformSetting) private readonly platform: Model<IPlatformSetting>,
    private readonly paystack: PaystackService,
    private readonly emails: EmailNotifications,
  ) {}

  // --- the clinic's share ---

  async commissionPercent() {
    if (this.commissionCache && Date.now() - this.commissionCache.at < 30_000) return this.commissionCache.percent;
    const row = await this.platform.findOne({ key: COMMISSION_KEY }).lean();
    const n = Number(row?.value);
    const percent = Number.isFinite(n) && n >= 0 && n <= 50 ? n : DEFAULT_COMMISSION;
    this.commissionCache = { at: Date.now(), percent };
    return percent;
  }

  async setCommission(value: unknown) {
    const percent = Number(value);
    if (!Number.isFinite(percent) || percent < 0 || percent > 50) fail('Enter a percentage between 0 and 50');
    const rounded = Math.round(percent * 10) / 10;
    await this.platform.updateOne({ key: COMMISSION_KEY }, { $set: { value: rounded } }, { upsert: true });
    this.commissionCache = undefined;
    return { success: true, message: `Doctors' visits now pay the clinic ${rounded}%. Past visits keep the % they were earned at.`, percent: rounded };
  }

  // --- recording what a visit earned ---

  /**
   * Records what a settled visit earned (once). Called when a doctor completes a visit and
   * when a patient no-show is recorded; `at` defaults to now.
   */
  async settle(appointmentId: Types.ObjectId | string, at = new Date()) {
    const a = await this.appointments.findOne({ _id: appointmentId, ...SETTLED, earning: { $exists: false } });
    if (!a) return;
    const percent = await this.commissionPercent();
    const grossCents = Math.round(a.amount * 100);
    const refundCents = a.refund ? Math.round(a.refund.amount * 100) : 0;
    const base = Math.max(0, grossCents - refundCents);
    const commissionCents = Math.round((base * percent) / 100);
    await this.appointments.updateOne(
      { _id: a._id, earning: { $exists: false } },
      { $set: { earning: { percent, grossCents, refundCents, commissionCents, doctorCents: base - commissionCents, at } } },
    );
  }

  /** Visits settled before earnings were recorded: record them now, dated at the visit's slot. */
  private async backfill(docId: string) {
    const older = await this.appointments
      .find({ docId, ...SETTLED, earning: { $exists: false } })
      .select(['date', 'slotDate', 'slotTime', 'missed'])
      .limit(500)
      .lean();
    for (const a of older) await this.settle(a._id, a.missed?.at ?? slotInstant(a.slotDate, a.slotTime) ?? new Date(a.date));
  }

  /** available: can be withdrawn now; waiting: settled in the last 7 days; inWithdrawal: in an open one. */
  async balance(docId: string) {
    await this.backfill(docId);
    const cutoff = new Date(Date.now() - HOLD_MS);
    const [earned] = await this.appointments.aggregate<{ ready: number; waiting: number; visits: number; commission: number }>([
      { $match: { docId, 'earning.at': { $exists: true } } },
      {
        $group: {
          _id: null,
          ready: { $sum: { $cond: [{ $lte: ['$earning.at', cutoff] }, '$earning.doctorCents', 0] } },
          waiting: { $sum: { $cond: [{ $gt: ['$earning.at', cutoff] }, '$earning.doctorCents', 0] } },
          visits: { $sum: 1 },
          commission: { $sum: '$earning.commissionCents' },
        },
      },
    ]);
    const paid = await this.payouts.aggregate<{ _id: DoctorPayoutStatus; cents: number }>([
      { $match: { docId: new Types.ObjectId(docId), status: { $in: ['pending', 'processing', 'paid'] } } },
      { $group: { _id: '$status', cents: { $sum: '$cents' } } },
    ]);
    const sum = (...s: DoctorPayoutStatus[]) => paid.filter((p) => s.includes(p._id)).reduce((n, p) => n + p.cents, 0);
    return {
      availableCents: Math.max(0, (earned?.ready ?? 0) - sum('pending', 'processing', 'paid')),
      waitingCents: earned?.waiting ?? 0,
      inWithdrawalCents: sum('pending', 'processing'),
      paidOutCents: sum('paid'),
      settledVisits: earned?.visits ?? 0,
      commissionPaidCents: earned?.commission ?? 0,
    };
  }

  // --- the doctor ---

  async overview(docId: string) {
    const [balance, doctor, payouts, visits, percent] = await Promise.all([
      this.balance(docId),
      this.doctors.findById(docId).select(['payoutBank']).lean(),
      this.payouts.find({ docId }).sort({ createdAt: -1 }).limit(50),
      this.appointments
        .find({ docId, 'earning.at': { $exists: true } })
        .select(['userData.name', 'slotDate', 'slotTime', 'kind', 'missed', 'earning'])
        .sort({ 'earning.at': -1 })
        .limit(50)
        .lean(),
      this.commissionPercent(),
    ]);
    // balance() ran the backfill first, so visits above include older ones
    const readyBefore = Date.now() - HOLD_MS;
    return {
      success: true,
      ...balance,
      commissionPercent: percent,
      minPayoutCents: minPayoutCents(),
      holdDays: HOLD_MS / (24 * 60 * 60_000),
      bank: doctor?.payoutBank ?? null,
      payouts: payouts.map(payoutView),
      visits: visits.map((v) => ({
        _id: String(v._id),
        patientName: v.userData?.name ?? 'Patient',
        slotDate: v.slotDate,
        slotTime: v.slotTime,
        kind: v.kind ?? 'in-person',
        noShow: v.missed?.by === 'patient',
        ...v.earning!,
        ready: new Date(v.earning!.at).getTime() <= readyBefore,
      })),
    };
  }

  async bankOptions() {
    const banks = await this.paystack.banks();
    return { success: true, paystack: this.paystack.configured && banks.length > 0, banks };
  }

  /** Where withdrawals go. With Paystack the bank confirms the account name; without it, typed in. */
  async saveBank(docId: string, body: { bankCode?: string; bankName?: string; accountNumber?: string; accountName?: string }) {
    const accountNumber = clean(body.accountNumber, 20);
    let bank: NonNullable<IDoctor['payoutBank']>;
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
    await this.doctors.updateOne({ _id: docId }, { $set: { payoutBank: bank } });
    return { success: true, message: bank.verified ? `Saved: the bank says this account belongs to ${bank.accountName}` : 'Saved', bank };
  }

  /** Withdraw what's available (or part of it). One open withdrawal at a time. */
  async requestPayout(docId: string, body: { cents?: number }) {
    const doctor = await this.doctors.findById(docId).select(['name', 'payoutBank']).lean();
    if (!doctor) fail('Doctor not found', HttpStatus.NOT_FOUND);
    if (!doctor.payoutBank) fail('Add the bank account to pay into first');
    const { availableCents } = await this.balance(docId);
    const cents = body.cents ? Math.floor(Number(body.cents)) : availableCents;
    if (!Number.isFinite(cents) || cents < minPayoutCents()) fail(`The smallest withdrawal is $${(minPayoutCents() / 100).toFixed(2)}`);
    if (cents > availableCents) fail(`You can withdraw up to $${(availableCents / 100).toFixed(2)} right now`);

    let payout: IDoctorPayout;
    try {
      payout = await this.payouts.create({
        docId: new Types.ObjectId(docId),
        doctorName: doctor.name,
        cents,
        bank: doctor.payoutBank,
        status: 'pending',
        open: true,
        provider: doctor.payoutBank.verified && doctor.payoutBank.bankCode ? 'paystack' : 'manual',
        payoutMinor: toPayoutKobo(cents) ?? undefined,
      });
    } catch (err: any) {
      // the unique "one open withdrawal" index: two requests at once can't both get through
      if (err?.code === 11000) fail('You already have a withdrawal in progress');
      throw err;
    }
    this.emails.doctorPayoutRequested(payout);
    return { success: true, message: "Withdrawal requested. We'll email you when it's sent.", payout: payoutView(payout) };
  }

  // --- the admin ---

  async adminList(status?: string) {
    const known: DoctorPayoutStatus[] = ['pending', 'processing', 'paid', 'rejected', 'failed'];
    const filter: { status?: DoctorPayoutStatus } = known.includes(status as DoctorPayoutStatus) ? { status: status as DoctorPayoutStatus } : {};
    const payouts = await this.payouts.find(filter).sort({ createdAt: -1 }).limit(200);
    const rate = Number(process.env.PAYOUT_USD_NGN_RATE);
    return {
      success: true,
      paystack: this.paystack.configured,
      ngnRate: Number.isFinite(rate) && rate > 0 ? rate : null,
      commissionPercent: await this.commissionPercent(),
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
        reason: `ADJ's CODEs doctor earnings`,
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
    this.emails.doctorPayoutDecided(paid, await this.doctorEmail(paid));
    return { success: true, message: 'Marked as paid' };
  }

  async reject(payoutId: string, body: { adminNote?: string }) {
    const adminNote = clean(body.adminNote, 500);
    if (!adminNote) fail('Give the doctor a reason');
    const existing = await this.find(payoutId);
    const rejected = await this.payouts.findOneAndUpdate(
      { _id: existing._id, status: 'pending' },
      { $set: { status: 'rejected', adminNote, decidedAt: new Date() }, $unset: { open: 1 } },
      { returnDocument: 'after' },
    );
    if (!rejected) fail('This withdrawal was already handled');
    this.emails.doctorPayoutDecided(rejected, await this.doctorEmail(rejected));
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
    if (done) this.emails.doctorPayoutDecided(done, await this.doctorEmail(done));
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

  private async doctorEmail(p: IDoctorPayout) {
    return (await this.doctors.findById(p.docId).select('email').lean())?.email;
  }
}
