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
import { NOT_A_HOLD } from '../appointments/booking.service';
import { EmailNotifications } from '../notifications/email-notifications';
import { GoogleCalendar } from '../settings/google-calendar';
import { WalletService } from '../wallet/wallet.service';
import { releaseSlot } from '../user/user.service';

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
};

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly cloudinary: CloudinaryService,
    private readonly emails: EmailNotifications,
    private readonly wallet: WalletService,
    private readonly calendar: GoogleCalendar,
  ) {}

  login(body: { email?: string; password?: string }) {
    const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;
    const valid =
      !!ADMIN_EMAIL && !!ADMIN_PASSWORD && body.email === ADMIN_EMAIL && body.password === ADMIN_PASSWORD;
    if (!valid) fail('Invalid credentials', HttpStatus.UNAUTHORIZED);
    return { success: true, token: jwt.sign(`${ADMIN_EMAIL}${ADMIN_PASSWORD}`, JWT_SECRET as string) };
  }

  async addDoctor(body: NewDoctor, imagePath?: string) {
    const { name, password, speciality, degree, experience, about, fees, address } = body;
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';

    if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
      fail('Missing Details');
    }
    if (!validator.isEmail(email)) fail('Please enter a valid email');
    if (password.length < 8) fail('Please enter a strong password');
    if (!imagePath) fail('Doctor Image is required');
    if (await this.doctors.exists({ email })) fail('A doctor with this email already exists');

    const image = await this.cloudinary.uploadImage(imagePath);
    await new this.doctors({
      name,
      email,
      image,
      password: await bcrypt.hash(password, await bcrypt.genSalt(10)),
      speciality,
      degree,
      experience,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now(),
    }).save();
    return { success: true, message: 'Doctor Added' };
  }

  async allDoctors() {
    const doctors = await this.doctors.find({}).select('-password');
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

    await this.appointments.findByIdAndUpdate(appointmentId, { cancelled: true });
    await releaseSlot(this.doctors, appointment);
    const refund = await this.wallet.refundAppointmentToWallet(String(appointment._id), 100, 'cancelled');
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
