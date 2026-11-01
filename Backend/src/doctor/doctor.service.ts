import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import type { Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IDoctor } from '../database/schemas/doctor.schema';
import { NOT_A_HOLD } from '../appointments/booking.service';
import { MessagesService } from '../messages/messages.service';
import { EmailNotifications } from '../notifications/email-notifications';
import { GoogleCalendar } from '../settings/google-calendar';
import { WalletService } from '../wallet/wallet.service';
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
  ) {}

  async list() {
    const doctors = await this.doctors.find({}).select(['-password', '-email']);
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

  async updateProfile(docId: string, body: { fees?: number; address?: any; available?: boolean }) {
    const { fees, address, available } = body;
    await this.doctors.findByIdAndUpdate(docId, { fees, address, available });
    return { success: true, message: 'profile Updates' };
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
