import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import { type IAppointment, REFUND_PERCENT } from '../database/schemas/appointment.schema';
import { DoctorEarningsService } from '../doctor/doctor-earnings.service';
import { slotInstant } from '../notifications/clinic-time';
import { EmailNotifications } from '../notifications/email-notifications';
import { GoogleCalendar } from '../settings/google-calendar';
import { AppointmentRefunds } from './appointment-refunds';

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

  constructor(
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly emails: EmailNotifications,
    private readonly refunds: AppointmentRefunds,
    private readonly calendar: GoogleCalendar,
    private readonly earnings: DoctorEarningsService,
  ) {}

  async markMissed(appointmentId: string | undefined, by: Who, markedBy: Marker, onlyForDoctor?: string) {
    if (by !== 'patient' && by !== 'doctor') fail('Say who missed it: patient or doctor');
    if (!appointmentId || !isValidObjectId(appointmentId)) fail('Appointment not found', HttpStatus.NOT_FOUND);
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) fail('Appointment not found', HttpStatus.NOT_FOUND);
    if (onlyForDoctor && appointment.docId.toString() !== onlyForDoctor) fail('Unauthorized', HttpStatus.FORBIDDEN);
    if (appointment.cancelled || appointment.isCompleted || appointment.missed) {
      fail('This appointment is already closed');
    }
    if (appointment.holdExpiresAt && !appointment.payment) fail('This time was only held and never paid for');
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

    const refund = await this.refunds.refund(missed, REFUND_PERCENT[by], 'missed');
    // a patient no-show earns the doctor what wasn't refunded (after the refund is recorded)
    if (by === 'patient') await this.earnings.settle(missed._id).catch((err) => this.logger.error(`earning for ${missed._id}: ${err.message}`));
    this.emails.appointmentMissed(missed, refund);
    void this.calendar.remove(missed);
    this.logger.log(`appointment ${appointmentId} missed by ${by} (marked by ${markedBy})${refund ? `, refund ${refund.status}` : ''}`);

    const who = by === 'patient' ? 'Patient no-show' : 'Missed by the doctor';
    const money = refund ? ` · ${refund.percent}% refund ${refund.status === 'refunded' ? 'sent' : 'to be sent by the clinic'}` : '';
    return { success: true, message: `${who} recorded${money}`, refund };
  }
}
