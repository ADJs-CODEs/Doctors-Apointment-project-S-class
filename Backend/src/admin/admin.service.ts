import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import type { Model } from 'mongoose';
import validator from 'validator';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IDoctor } from '../database/schemas/doctor.schema';
import type { IUser } from '../database/schemas/user.schema';
import { CloudinaryService } from '../integrations/integrations';
import { normalizeAvailability } from '../appointments/availability';
import { NOT_A_HOLD } from '../appointments/booking.service';
import { tempPassword } from '../pharmacy/pharmacy.service';
import { EmailNotifications } from '../notifications/email-notifications';
import { GoogleCalendar } from '../settings/google-calendar';
import { releaseSlot } from '../user/user.service';
import { AppointmentRefunds } from '../appointments/appointment-refunds';

type NewDoctor = {
  name?: string;
  email?: string;
  password?: string;
  speciality?: string;
  degree?: string;
  experience?: string;
  about?: string;
  fees?: string;
  address?: string; // JSON string, sent as multipart form data
  /** empty = no video calls */
  videoFees?: string;
  /** JSON string of { slotMinutes, weekly, daysOff }; missing = the old 10am–9pm default */
  availability?: string;
  available?: string;
};

const parseJson = (raw: unknown) => {
  if (typeof raw !== 'string' || !raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly cloudinary: CloudinaryService,
    private readonly emails: EmailNotifications,
    private readonly calendar: GoogleCalendar,
    private readonly refunds: AppointmentRefunds,
  ) {}

  login(body: { email?: string; password?: string }) {
    const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;
    const valid =
      !!ADMIN_EMAIL && !!ADMIN_PASSWORD && body.email === ADMIN_EMAIL && body.password === ADMIN_PASSWORD;
    if (!valid) fail('Invalid credentials', HttpStatus.UNAUTHORIZED);
    return { success: true, token: jwt.sign(`${ADMIN_EMAIL}${ADMIN_PASSWORD}`, JWT_SECRET as string) };
  }

  /**
   * Adds a doctor with their fees and hours. They get their login by email and must choose
   * their own password the first time they sign in. Without a password typed in, one is
   * made up; it's returned once so the admin can pass it on if the email doesn't arrive.
   */
  async addDoctor(body: NewDoctor, imagePath?: string) {
    const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const name = text(body.name, 80);
    const email = text(body.email, 120).toLowerCase();
    const speciality = text(body.speciality, 60);
    const degree = text(body.degree, 60);
    const experience = text(body.experience, 40);
    const about = text(body.about, 2000);
    const address = parseJson(body.address);
    const line1 = text(address?.line1, 200);

    if (!name || !email || !speciality || !degree || !experience || !about || !line1) fail('Fill in every field');
    if (!validator.isEmail(email)) fail('Please enter a valid email');
    if (about.length < 20) fail('Write a sentence or two about the doctor (20+ characters)');
    const fees = Number(body.fees);
    if (!Number.isFinite(fees) || fees <= 0 || fees > 100_000) fail('Enter a clinic visit fee above 0');

    const typed = text(body.password, 100);
    if (typed && typed.length < 8) fail('The password needs at least 8 characters, or leave it empty to make one up');
    const password = typed || tempPassword();

    const videoFees = body.videoFees === undefined || body.videoFees === '' ? null : Number(body.videoFees);
    if (videoFees !== null && (!Number.isFinite(videoFees) || videoFees <= 0 || videoFees > 100_000)) fail('Enter a video fee above 0, or leave it empty');
    const rawHours = parseJson(body.availability);
    const availability = rawHours ? normalizeAvailability(rawHours) : undefined;
    if (availability && availability.weekly.length === 0) fail('Give the doctor at least one block of working hours');
    if (availability?.weekly.some((w) => w.kinds.includes('video')) && !videoFees) fail('Set a video fee to offer video call hours');

    if (!imagePath) fail('Add a photo of the doctor');
    if (await this.doctors.exists({ email })) fail('A doctor with this email already exists');

    const image = await this.cloudinary.uploadImage(imagePath);
    const doctor = await new this.doctors({
      name,
      email,
      image,
      password: await bcrypt.hash(password, await bcrypt.genSalt(10)),
      mustChangePassword: true,
      speciality,
      degree,
      experience,
      about,
      fees: Math.round(fees * 100) / 100,
      ...(videoFees !== null && { videoFees }),
      ...(availability && { availability }),
      available: body.available !== 'false',
      address: { line1, line2: text(address?.line2, 200) },
      date: Date.now(),
    }).save();
    this.emails.doctorAdded(doctor, password);
    return {
      success: true,
      message: `${name} added. Their login has been emailed to ${email}.`,
      login: { email, startingPassword: password },
    };
  }

  async allDoctors() {
    const doctors = await this.doctors.find({}).select('-password -googleCalendar');
    return { success: true, doctors };
  }

  async allAppointments() {
    const appointments = await this.appointments.find({ ...NOT_A_HOLD });
    return { success: true, appointments };
  }

  async cancelAppointment(appointmentId?: string) {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) fail('Appointment not found', HttpStatus.NOT_FOUND);
    if (appointment.missed) fail('This appointment was recorded as missed');

    // claim it atomically, so a double click can't cancel (and refund) twice
    const cancelled = await this.appointments.findOneAndUpdate(
      { _id: appointment._id, cancelled: false, isCompleted: false, missed: { $exists: false } },
      { $set: { cancelled: true } },
      { returnDocument: 'after' },
    );
    if (!cancelled) fail('This appointment is already closed');
    await releaseSlot(this.doctors, appointment);
    // the full fee goes back the way it was paid: wallet, or card through Stripe
    const refund = await this.refunds.refund(cancelled, 100, 'cancelled');
    this.emails.appointmentCancelled(appointment, 'admin', refund);
    void this.calendar.remove(appointment);
    return { success: true, message: 'Appointment Canceled' };
  }

  async dashboard() {
    const [doctors, patients, appointments] = await Promise.all([
      this.doctors.countDocuments(),
      this.users.countDocuments(),
      this.appointments.find({ ...NOT_A_HOLD }),
    ]);
    return {
      success: true,
      dashData: {
        doctors,
        appointments: appointments.length,
        patients,
        latestAppointments: appointments.reverse().slice(0, 5),
      },
    };
  }

  async deleteDoctor(docId?: string) {
    if (!docId) fail('Doctor ID is required');
    const deleted = await this.doctors.findByIdAndDelete(docId);
    if (!deleted) fail('Doctor not found in registry', HttpStatus.NOT_FOUND);

    await this.appointments.deleteMany({ docId });
    return { success: true, message: 'Doctor and associated records terminated' };
  }
}
