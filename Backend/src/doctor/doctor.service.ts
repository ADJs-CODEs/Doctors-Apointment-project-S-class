import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { isValidObjectId, type Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IDoctor } from '../database/schemas/doctor.schema';
import { NOT_A_HOLD } from '../appointments/booking.service';
import { MessagesService } from '../messages/messages.service';
import { EmailNotifications } from '../notifications/email-notifications';
import { GoogleCalendar } from '../settings/google-calendar';
import { WalletService } from '../wallet/wallet.service';
import { DoctorEarningsService } from './doctor-earnings.service';
import { releaseSlot } from '../user/user.service';

// The doctor panel expects failures here as HTTP 200 with { success: false }, so most
// methods use failOk(); only send-alert used real error codes in the original API.
function failOk(message: string): never {
  fail(message, HttpStatus.OK);
}

@Injectable()
export class DoctorService {
  constructor(
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly chat: MessagesService,
    private readonly emails: EmailNotifications,
    private readonly wallet: WalletService,
    private readonly calendar: GoogleCalendar,
    private readonly earnings: DoctorEarningsService,
  ) {}

  async list() {
    // public list: no login or private settings
    const doctors = await this.doctors.find({}).select(['-password', '-email', '-settings', '-googleCalendar', '-payoutBank', '-mustChangePassword']);
    return { success: true, doctors };
  }

  async changeAvailability(docId?: string) {
    const doctor = await this.doctors.findById(docId);
    if (!doctor) failOk('Doctor not found');
    await this.doctors.findByIdAndUpdate(docId, { available: !doctor.available });
    return { success: true, message: 'Availability changed' };
  }

  async login(body: { email?: string; password?: string }) {
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const doctor = await this.doctors.findOne({ email });
    if (!doctor) failOk('invalid credentials');

    const isMatch = await bcrypt.compare(body.password ?? '', doctor.password);
    if (!isMatch) failOk('invalid credentials');
    return { success: true, token: jwt.sign({ id: doctor._id }, process.env.JWT_SECRET as string) };
  }

  async appointmentsFor(docId: string) {
    const appointments = await this.appointments.find({ docId, ...NOT_A_HOLD });
    return { success: true, appointments };
  }

  async complete(docId: string, body: { appointmentId?: string; healthData?: any }) {
    const { appointmentId, healthData } = body;
    if (!healthData) failOk('Health data required');

    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment || appointment.docId.toString() !== docId) failOk('Auth Failed');
    if (appointment.missed) failOk('This appointment was recorded as missed');

    await this.appointments.findByIdAndUpdate(appointmentId, {
      isCompleted: true,
      healthData: {
        bloodPressure: healthData.bloodPressure,
        heartRate: healthData.heartRate,
        temperature: healthData.temperature,
        doctorNotes: healthData.doctorNotes,
        prescribedMedicines: (healthData.prescribedMedicines ?? []).map((med: any) => ({
          ...med,
          remainingQuantity: Number(med.totalQuantity),
          adherenceLogs: [],
          status: 'Active',
        })),
      },
    });
    // the wallet works from the record anyway, so a failure here is caught up on its next view
    await this.earnings.settle(appointment._id).catch(() => undefined);
    return { success: true, message: 'Appointment Completed' };
  }

  async cancel(docId: string, appointmentId?: string) {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment || appointment.docId.toString() !== docId) failOk(' Cancellation Failed');
    if (appointment.missed || appointment.isCompleted) failOk('This appointment is already closed');

    await this.appointments.findByIdAndUpdate(appointmentId, { cancelled: true });
    // free the slot, like patient and admin cancellations already did
    await releaseSlot(this.doctors, appointment);
    const refund = await this.wallet.refundAppointmentToWallet(String(appointment._id), 100, 'cancelled');
    this.emails.appointmentCancelled(appointment, 'doctor', refund);
    void this.calendar.remove(appointment);
    return { success: true, message: 'Appointment Cancelled' };
  }

  async dashboard(docId: string) {
    const appointments = await this.appointments.find({ docId, ...NOT_A_HOLD });

    let earnings = 0;
    const patients = new Set<string>();
    for (const a of appointments) {
      // refunds for missed visits come out of what the doctor earned
      if (a.isCompleted || a.payment) earnings += a.amount - (a.refund?.amount ?? 0);
      patients.add(a.userId.toString());
    }
    return {
      success: true,
      dashData: {
        earnings,
        appointments: appointments.length,
        patients: patients.size,
        latestAppointment: appointments.reverse().slice(0, 5),
      },
    };
  }

  async profile(docId: string) {
    const profileData = await this.doctors.findById(docId).select('-password');
    return { success: true, profileData };
  }

  /**
   * "Mark as resolved": takes the patient off Critical across their visits with this doctor,
   * and clears early-dose warnings, so the red flag doesn't stay forever.
   */
  async resolveCritical(docId: string, userId?: string) {
    if (!userId || !isValidObjectId(userId)) failOk('Patient not found');
    const visits = await this.appointments.find({ docId, userId }).select(['isCompleted', 'patientStatus', 'healthData.prescribedMedicines.overdoseAlert']);
    if (!visits.length) failOk('This patient has no visits with you');
    let cleared = 0;
    for (const v of visits) {
      const critical = v.patientStatus === 'Critical';
      const earlyDose = v.healthData?.prescribedMedicines?.some((m) => m.overdoseAlert);
      if (!critical && !earlyDose) continue;
      await this.appointments.updateOne(
        { _id: v._id },
        {
          $set: {
            ...(critical && { patientStatus: v.isCompleted ? 'Completed' : 'Stable' }),
            ...(earlyDose && { 'healthData.prescribedMedicines.$[m].overdoseAlert': false }),
          },
        },
        earlyDose ? { arrayFilters: [{ 'm.overdoseAlert': true }] } : {},
      );
      cleared++;
    }
    return { success: true, message: cleared ? 'Marked as resolved' : 'Nothing to resolve', cleared };
  }

  /** What the doctor can change about themselves; anything not sent stays as it is. */
  async updateProfile(
    docId: string,
    body: { fees?: unknown; address?: any; available?: unknown; about?: unknown; experience?: unknown; degree?: unknown },
  ) {
    const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
    const update: Partial<Pick<IDoctor, 'fees' | 'address' | 'available' | 'about' | 'experience' | 'degree'>> = {};

    if (body.fees !== undefined) {
      const fees = Number(body.fees);
      if (!Number.isFinite(fees) || fees <= 0 || fees > 100_000) failOk('Enter a fee above 0');
      update.fees = Math.round(fees * 100) / 100;
    }
    if (body.address !== undefined) {
      const line1 = text(body.address?.line1, 200) ?? '';
      if (!line1) failOk('Enter the first line of the clinic address');
      update.address = { line1, line2: text(body.address?.line2, 200) ?? '' };
    }
    if (typeof body.available === 'boolean') update.available = body.available;
    const about = text(body.about, 2000);
    if (about !== undefined) {
      if (about.length < 20) failOk('Write at least a sentence or two about yourself (20+ characters)');
      update.about = about;
    }
    const experience = text(body.experience, 40);
    if (experience) update.experience = experience;
    const degree = text(body.degree, 60);
    if (degree) update.degree = degree;

    await this.doctors.updateOne({ _id: docId }, { $set: update });
    return { success: true, message: 'Profile saved' };
  }

  async sendPatientAlert(
    docId: string,
    body: { appointmentId?: string; messageContent?: string; isCritical?: boolean },
  ) {
    const { appointmentId, messageContent, isCritical } = body;
    if (!messageContent) fail('Message required');

    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) fail('Appointment not found', HttpStatus.NOT_FOUND);
    if (appointment.docId.toString() !== docId) fail('Unauthorized', HttpStatus.FORBIDDEN);

    const sentAt = new Date();
    appointment.messages.push({
      sender: 'Doctor',
      content: messageContent,
      sentAt,
      isRead: false,
    });
    if (isCritical) appointment.patientStatus = 'Critical';
    appointment.lastWarningSent = sentAt;
    await appointment.save();
    // chat copy + in-app notification + email (and care circle, when critical)
    await this.chat.recordAlert(appointment, messageContent, sentAt, !!isCritical);
    return { success: true, message: 'Alert sent to patient successfully' };
  }
}
