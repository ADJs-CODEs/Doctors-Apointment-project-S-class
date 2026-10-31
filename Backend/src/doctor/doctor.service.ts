import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import type { Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IDoctor } from '../database/schemas/doctor.schema';
import { MailService } from '../integrations/integrations';
import { releaseSlot } from '../user/user.service';

// The doctor panel expects failures here as HTTP 200 with { success: false }, so most
// methods use failOk(); only send-alert used real error codes in the original API.
function failOk(message: string): never {
  fail(message, HttpStatus.OK);
}

@Injectable()
export class DoctorService {
  private readonly logger = new Logger('DoctorService');

  constructor(
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly mail: MailService,
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
    const appointments = await this.appointments.find({ docId });
    return { success: true, appointments };
  }

  async complete(docId: string, body: { appointmentId?: string; healthData?: any }) {
    const { appointmentId, healthData } = body;
    if (!healthData) failOk('Health data required');

    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment || appointment.docId.toString() !== docId) failOk('Auth Failed');

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

    await this.appointments.findByIdAndUpdate(appointmentId, { cancelled: true });
    // free the slot, like patient and admin cancellations already did
    await releaseSlot(this.doctors, appointment);
    return { success: true, message: 'Appointment Cancelled' };
  }

  async dashboard(docId: string) {
    const appointments = await this.appointments.find({ docId });

    let earnings = 0;
    const patients = new Set<string>();
    for (const a of appointments) {
      if (a.isCompleted || a.payment) earnings += a.amount;
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

    appointment.messages.push({
      sender: 'Doctor',
      content: messageContent,
      sentAt: new Date(),
      isRead: false,
    });
    if (isCritical) appointment.patientStatus = 'Critical';
    appointment.lastWarningSent = new Date();
    await appointment.save();

    const patient = appointment.userData;
    try {
      await this.mail.send({
        to: patient.email,
        replyTo: appointment.docData?.email,
        subject: isCritical ? 'URGENT: Medical Alert from your Doctor' : 'New Message from your Doctor',
        text: `Hello ${patient.name},\n\nYour doctor has sent you a message regarding your appointment:\n\n"${messageContent}"\n\nPlease log into the app to view details.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: ${isCritical ? '#ef4444' : '#0d9488'};">Medical Notification</h2>
            <p>Hello <strong>${patient.name}</strong>,</p>
            <p>Your doctor has sent a new update regarding your medication schedule:</p>
            <blockquote style="background: #f9fafb; padding: 15px; border-left: 4px solid #0d9488;">
              ${messageContent}
            </blockquote>
            <p>Please check your mobile app for live tracking updates.</p>
          </div>`,
      });
    } catch (err: any) {
      this.logger.error(`alert email failed: ${err.message}`);
      fail('Failed to send alert: ' + err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { success: true, message: 'Alert sent to patient successfully' };
  }
}
