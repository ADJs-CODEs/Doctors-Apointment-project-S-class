import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model } from 'mongoose';
import Stripe from 'stripe';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IDoctor, VisitKind } from '../database/schemas/doctor.schema';
import type { IUser } from '../database/schemas/user.schema';
import { EmailNotifications } from '../notifications/email-notifications';
import { GoogleCalendar } from '../settings/google-calendar';
import { WalletService } from '../wallet/wallet.service';
import { feeFor, isBookable, labelMinutes, offers, slotLabel } from './availability';

const MINUTE = 60_000;
/** how long a picked slot is held while the patient pays */
export const HOLD_MINUTES = 30;
/** Stripe won't let a checkout expire sooner than 30 minutes after it's created */
const STRIPE_MIN_MINUTES = 31;

/** A paid appointment is real; an unpaid one with holdExpiresAt is only a hold. */
export const NOT_A_HOLD = { holdExpiresAt: { $exists: false } };

/**
 * Booking = hold the slot, pay, confirm.
 *  1. hold: the slot is reserved atomically (no double booking) and an unpaid appointment
 *     is created with holdExpiresAt (30 min);
 *  2. pay: from the wallet, or by card through Stripe (the checkout can't outlive the hold);
 *  3. confirm: once paid, the hold is cleared and the booking emails/calendar go out.
 * Unpaid holds are removed and the slot freed when they expire (checked every few
 * minutes, and whenever someone looks at that doctor's times).
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger('Booking');
  private stripeClient?: Stripe;

  constructor(
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    private readonly wallet: WalletService,
    private readonly emails: EmailNotifications,
    private readonly calendar: GoogleCalendar,
  ) {}

  private get stripe() {
    this.stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY as string);
    return this.stripeClient;
  }

  // --- 1. hold ---

  async hold(userId: string, body: { docId?: string; slotDate?: string; slotTime?: string; kind?: string }) {
    const { docId, slotDate, slotTime } = body;
    const kind: VisitKind = body.kind === 'video' ? 'video' : 'in-person';
    if (!docId || !slotDate || !slotTime) fail('Missing booking details');
    if (!isValidObjectId(docId)) fail('Doctor not found', HttpStatus.NOT_FOUND);

    await this.expireHolds(docId); // free anything that lapsed, so it can be picked
    const doctor = await this.doctors.findById(docId).select('-password');
    if (!doctor) fail('Doctor not found', HttpStatus.NOT_FOUND);
    if (!doctor.available) fail('This doctor is not taking bookings right now');
    if (!offers(doctor, kind)) fail(kind === 'video' ? "This doctor doesn't offer video calls" : "This doctor isn't taking clinic visits");
    if (!isBookable(doctor, kind, slotDate, slotTime)) fail('That time is no longer available. Please pick another.');

    // one format for every new booking, and an atomic "only if still free" reservation
    const label = slotLabel(labelMinutes(slotTime)!);
    const reserved = await this.doctors.updateOne(
      { _id: docId, [`slots_booked.${slotDate}`]: { $ne: label } },
      { $push: { [`slots_booked.${slotDate}`]: label } },
    );
    if (!reserved.modifiedCount) fail('Someone just booked that time. Please pick another.');

    try {
      // the copy stored on the appointment is visible to the doctor: keep private fields out
      const userData = await this.users
        .findById(userId)
        .select('-password -resetToken -resetTokenExpire -settings -googleCalendar');
      const appointment = await this.appointments.create({
        userId,
        docId,
        userData,
        docData: doctor,
        amount: feeFor(doctor, kind),
        slotDate,
        slotTime: label,
        kind,
        date: Date.now(),
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * MINUTE),
      });
      return {
        success: true,
        message: `Time held for ${HOLD_MINUTES} minutes. Pay to confirm it.`,
        appointmentId: appointment._id,
        appointment,
      };
    } catch (err) {
      await this.releaseLabel(docId, slotDate, label);
      throw err;
    }
  }

  // --- 2. pay ---

  /** Wallet payment, then confirm the booking if it was a hold. */
  async payFromWallet(userId: string, appointmentId?: string) {
    const result = await this.wallet.payAppointment(userId, appointmentId);
    const paid = await this.appointments.findById(appointmentId);
    if (paid) await this.confirmIfHeld(paid);
    return { ...result, message: `${result.message}. Your booking is confirmed.` };
  }

  /** Stripe Checkout for an unpaid appointment (a hold or an older unpaid booking). */
  async createCheckout(userId: string, appointmentId?: string) {
    if (!appointmentId || !isValidObjectId(appointmentId)) fail('Invalid appointment');
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment || appointment.cancelled || appointment.missed) fail('Invalid appointment');
    if (appointment.payment) fail('This appointment is already paid');
    if (appointment.userId.toString() !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);
    if (appointment.holdExpiresAt && appointment.holdExpiresAt.getTime() < Date.now()) {
      fail('This time is no longer held. Please book it again.');
    }

    let expiresAt: number | undefined;
    if (appointment.holdExpiresAt) {
      // keep the hold at least as long as the checkout can be paid
      expiresAt = Math.floor((Date.now() + STRIPE_MIN_MINUTES * MINUTE) / 1000);
      const holdUntil = new Date(Math.max(appointment.holdExpiresAt.getTime(), (expiresAt + 60) * 1000));
      await this.appointments.updateOne({ _id: appointment._id }, { $set: { holdExpiresAt: holdUntil } });
    }

    const returnUrl = `${process.env.USER_URL}/verify?appointmentId=${appointmentId}`;
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${returnUrl}&success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}&success=false`,
      metadata: { appointmentId: String(appointmentId) },
      ...(expiresAt && { expires_at: expiresAt }),
      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY || 'usd',
            product_data: {
              name: `${appointment.kind === 'video' ? 'Video call' : 'Appointment'} with ${appointment.docData.name}`,
              description: `${appointment.slotDate.replace(/_/g, '/')} at ${appointment.slotTime}`,
            },
            unit_amount: Math.round(appointment.amount * 100),
          },
          quantity: 1,
        },
      ],
    });
    await this.appointments.updateOne({ _id: appointment._id }, { $set: { stripeSessionId: session.id } });
    return { success: true, session_url: session.url };
  }

  /**
   * Marks an appointment paid from a paid Stripe Checkout session (once), sends the
   * receipt and confirms the booking if it was a hold. Used when the patient returns to
   * the site (verify-stripe) and by the Stripe webhook; whichever runs second does nothing.
   */
  async markStripePaid(session: Stripe.Checkout.Session) {
    const appointmentId = session.metadata?.appointmentId;
    if (!appointmentId || !isValidObjectId(appointmentId) || session.payment_status !== 'paid') return null;
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    const justPaid = await this.appointments.findOneAndUpdate(
      { _id: appointmentId, payment: false },
      { $set: { payment: true, paymentMethod: 'stripe', ...(paymentIntentId && { paymentIntentId }) } },
      { returnDocument: 'after' },
    );
    if (!justPaid) return null;
    this.emails.paymentReceived(justPaid, session.id);
    await this.confirmIfHeld(justPaid);
    return justPaid;
  }

  // --- 3. confirm ---

  /** A hold that has just been paid becomes a booking (once). */
  async confirmIfHeld(appointment: IAppointment) {
    const confirmed = await this.appointments.findOneAndUpdate(
      { _id: appointment._id, payment: true, holdExpiresAt: { $exists: true } },
      { $unset: { holdExpiresAt: 1 } },
      { returnDocument: 'after' },
    );
    if (!confirmed) return false;
    this.emails.bookingConfirmed(confirmed);
    void this.calendar.upsert(confirmed);
    return true;
  }

  // --- expiry ---

  /**
   * Removes unpaid holds whose time ran out and frees their slots. A hold whose Stripe
   * checkout was actually paid (the patient just never came back) is confirmed instead.
   */
  async expireHolds(docId?: string) {
    const lapsed = await this.appointments.find({
      payment: false,
      holdExpiresAt: { $lt: new Date() },
      ...(docId && { docId }),
    });
    let removed = 0;
    for (const hold of lapsed) {
      if (hold.stripeSessionId) {
        try {
          const session = await this.stripe.checkout.sessions.retrieve(hold.stripeSessionId);
          if (session.payment_status === 'paid') {
            await this.markStripePaid(session);
            continue;
          }
        } catch (err: any) {
          // can't reach Stripe: leave it for the next check rather than risk dropping a paid booking
          this.logger.warn(`couldn't check Stripe for hold ${hold._id}: ${err.message}`);
          continue;
        }
      }
      const gone = await this.appointments.deleteOne({ _id: hold._id, payment: false });
      if (gone.deletedCount) {
        await this.releaseLabel(hold.docId, hold.slotDate, hold.slotTime);
        removed++;
      }
    }
    if (removed) this.logger.log(`released ${removed} unpaid hold${removed === 1 ? '' : 's'}`);
    return removed;
  }

  private async releaseLabel(docId: string, slotDate: string, label: string) {
    await this.doctors.updateOne({ _id: docId }, { $pull: { [`slots_booked.${slotDate}`]: label } });
  }
}
