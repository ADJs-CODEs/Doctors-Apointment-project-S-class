import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import Stripe from 'stripe';
import { MODEL } from '../database/models';
import type { IAppointment, IRefund } from '../database/schemas/appointment.schema';
import { EmailNotifications } from '../notifications/email-notifications';
import { WalletService } from '../wallet/wallet.service';

/**
 * Gives back a share of a paid appointment fee the way it was paid: wallet payments straight
 * back into the wallet, card payments through Stripe. Used for missed visits (50% / 100%) and
 * cancellations (100%). Once per appointment: an existing `refund` is returned as it is, and the
 * Stripe idempotency key means a retry gets the first refund back instead of a second one.
 * Anything that can't be refunded automatically is recorded as manual/failed and the admin is
 * emailed. Never throws.
 */
@Injectable()
export class AppointmentRefunds {
  private readonly logger = new Logger('AppointmentRefunds');
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

  async refund(a: IAppointment, percent: number, reason: 'missed' | 'cancelled'): Promise<IRefund | null> {
    if (!a.payment) return null;
    const current = await this.appointments.findById(a._id).select('refund').lean();
    if (current?.refund) return current.refund;
    const amount = Math.round(a.amount * percent) / 100; // e.g. 50% of 50 -> 25

    if (a.paymentMethod === 'wallet') {
      try {
        const back = await this.wallet.refundAppointmentToWallet(String(a._id), percent, reason);
        if (back) return back;
      } catch (err: any) {
        this.logger.error(`wallet refund for ${a._id} failed: ${err.message}`);
      }
      const failed: IRefund = { percent, amount, status: 'failed', method: 'wallet', reason, error: 'wallet refund failed', at: new Date() };
      await this.appointments.updateOne({ _id: a._id, refund: { $exists: false } }, { $set: { refund: failed } });
      this.emails.refundNeedsAdmin(a, failed);
      return failed;
    }

    let record: IRefund;
    if (!a.paymentIntentId) {
      // paid before payment references were stored: nothing for Stripe to refund against
      record = { percent, amount, status: 'manual', method: 'stripe', reason, at: new Date() };
    } else {
      try {
        const refund = await this.stripe.refunds.create(
          {
            payment_intent: a.paymentIntentId,
            amount: Math.round(a.amount * percent), // smallest unit (cents): amount * 100 * percent / 100
            reason: 'requested_by_customer',
            metadata: { appointmentId: String(a._id), reason: `${reason} appointment, ${percent}%` },
          },
          // same key -> Stripe returns the first refund instead of making a second one
          { idempotencyKey: `${reason}-appointment-refund-${a._id}` },
        );
        record = { percent, amount, status: 'refunded', method: 'stripe', reason, stripeRefundId: refund.id, at: new Date() };
      } catch (err: any) {
        this.logger.error(`Stripe refund for ${a._id} failed: ${err.message}`);
        record = { percent, amount, status: 'failed', method: 'stripe', reason, error: String(err.message).slice(0, 300), at: new Date() };
      }
    }

    await this.appointments.updateOne({ _id: a._id, refund: { $exists: false } }, { $set: { refund: record } });
    if (record.status !== 'refunded') this.emails.refundNeedsAdmin(a, record);
    return record;
  }
}
