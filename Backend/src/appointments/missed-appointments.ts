import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model } from 'mongoose';
import Stripe from 'stripe';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import { type IAppointment, type IRefund, REFUND_PERCENT } from '../database/schemas/appointment.schema';
import { slotInstant } from '../notifications/clinic-time';
import { EmailNotifications } from '../notifications/email-notifications';
import { WalletService } from '../wallet/wallet.service';

type Who = 'patient' | 'doctor';
type Marker = 'doctor' | 'admin' | 'system';

/**
 * Missed appointments ("no-shows") and their refunds:
 *  - the patient didn't come  -> 50% of a paid fee back (the doctor keeps half for the time)
 *  - the doctor didn't come   -> 100% back
 * Doctors mark their own patients' no-shows; the admin can mark either; and a paid or
 * unpaid visit still open 24h after its slot is marked as missed by the doctor
 * automatically (they never recorded it). Refunds go back to the card through Stripe.
 */
@Injectable()
export class MissedAppointments {
  private readonly logger = new Logger('MissedAppointments');
  private stripeClient?: Stripe;

  constructor(
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly emails: EmailNotifications,
    private readonly wallet: WalletService,
  ) {}

  private get stripe() {
    this.stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY as string);
    return this.stripeClient;
  }

  async markMissed(appointmentId: string | undefined, by: Who, markedBy: Marker, onlyForDoctor?: string) {
    if (by !== 'patient' && by !== 'doctor') fail('Say who missed it: patient or doctor');
    if (!appointmentId || !isValidObjectId(appointmentId)) fail('Appointment not found', HttpStatus.NOT_FOUND);
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) fail('Appointment not found', HttpStatus.NOT_FOUND);
    if (onlyForDoctor && appointment.docId.toString() !== onlyForDoctor) fail('Unauthorized', HttpStatus.FORBIDDEN);
    if (appointment.cancelled || appointment.isCompleted || appointment.missed) {
      fail('This appointment is already closed');
    }
    if (markedBy !== 'system') {
      const startsAt = slotInstant(appointment.slotDate, appointment.slotTime);
      if (!startsAt || Date.now() < startsAt.getTime()) fail("You can only mark it missed after it's started");
    }

    // claim it atomically, so it's only closed (and refunded) once
    const missed = await this.appointments.findOneAndUpdate(
      { _id: appointmentId, cancelled: false, isCompleted: false, missed: { $exists: false } },
      { $set: { missed: { by, markedBy, at: new Date() } } },
      { returnDocument: 'after' },
    );
    if (!missed) fail('This appointment is already closed');

    const refund = missed.payment ? await this.refund(missed, REFUND_PERCENT[by]) : null;
    this.emails.appointmentMissed(missed, refund);
    this.logger.log(`appointment ${appointmentId} missed by ${by} (marked by ${markedBy})${refund ? `, refund ${refund.status}` : ''}`);

    const who = by === 'patient' ? 'Patient no-show' : 'Missed by the doctor';
    const money = refund ? ` · ${refund.percent}% refund ${refund.status === 'refunded' ? 'sent' : 'to be sent by the clinic'}` : '';
    return { success: true, message: `${who} recorded${money}`, refund };
  }

  /** Refunds a share of the fee the way it was paid (card or wallet). Never throws. */
  private async refund(a: IAppointment, percent: number): Promise<IRefund> {
    const amount = Math.round(a.amount * percent) / 100; // e.g. 50% of 50 -> 25

    if (a.paymentMethod === 'wallet') {
      // straight back into the wallet, instantly
      try {
        const back = await this.wallet.refundAppointmentToWallet(String(a._id), percent, 'missed');
        if (back) return back;
      } catch (err: any) {
        this.logger.error(`wallet refund for ${a._id} failed: ${err.message}`);
      }
      const failed: IRefund = { percent, amount, status: 'failed', method: 'wallet', reason: 'missed', error: 'wallet refund failed', at: new Date() };
      await this.appointments.updateOne({ _id: a._id, refund: { $exists: false } }, { $set: { refund: failed } });
      this.emails.refundNeedsAdmin(a, failed);
      return failed;
    }

    let record: IRefund;
    if (!a.paymentIntentId) {
      // paid before payment references were stored: nothing for Stripe to refund against
      record = { percent, amount, status: 'manual', method: 'stripe', reason: 'missed', at: new Date() };
    } else {
      try {
        const refund = await this.stripe.refunds.create(
          {
            payment_intent: a.paymentIntentId,
            amount: Math.round(a.amount * percent), // smallest unit (cents): amount * 100 * percent / 100
            reason: 'requested_by_customer',
            metadata: { appointmentId: String(a._id), reason: `missed appointment, ${percent}%` },
          },
          // same key -> Stripe returns the first refund instead of making a second one
          { idempotencyKey: `missed-appointment-refund-${a._id}` },
        );
        record = { percent, amount, status: 'refunded', method: 'stripe', reason: 'missed', stripeRefundId: refund.id, at: new Date() };
      } catch (err: any) {
        this.logger.error(`Stripe refund for ${a._id} failed: ${err.message}`);
        record = { percent, amount, status: 'failed', method: 'stripe', reason: 'missed', error: String(err.message).slice(0, 300), at: new Date() };
      }
    }

    await this.appointments.updateOne({ _id: a._id }, { $set: { refund: record } });
    if (record.status !== 'refunded') this.emails.refundNeedsAdmin(a, record);
    return record;
  }
}
