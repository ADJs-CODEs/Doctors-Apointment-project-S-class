import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { Model } from 'mongoose';
import Stripe from 'stripe';
import validator from 'validator';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import { hoursBetweenDoses, type IAppointment } from '../database/schemas/appointment.schema';
import type { IDoctor } from '../database/schemas/doctor.schema';
import type { IUser } from '../database/schemas/user.schema';
import { CloudinaryService, MailService, WebhookService } from '../integrations/integrations';

const normalizeEmail = (email: unknown) =>
  typeof email === 'string' ? email.toLowerCase().trim() : '';

const signToken = (id: unknown) => jwt.sign({ id }, process.env.JWT_SECRET as string);

const hash = async (password: string) => bcrypt.hash(password, await bcrypt.genSalt(10));

@Injectable()
export class UserService {
  private stripeClient?: Stripe;

  constructor(
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly cloudinary: CloudinaryService,
    private readonly mail: MailService,
    private readonly webhooks: WebhookService,
  ) {}

  private get stripe() {
    this.stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY as string);
    return this.stripeClient;
  }

  // --- authentication ---

  async register(body: { name?: string; email?: string; password?: string }) {
    const { name, password } = body;
    const email = normalizeEmail(body.email);
    if (!name || !email || !password) fail('missing details');
    if (!validator.isEmail(email)) fail('enter a valid email');
    if (password.length < 8) fail('enter a strong password');

    const user = await new this.users({ name, email, password: await hash(password) }).save();
    this.webhooks.trigger('N8N_SIGNUP_WEBHOOK', { name: user.name, email: user.email });
    return { success: true, token: signToken(user._id) };
  }

  async login(body: { email?: string; password?: string }) {
    const user = await this.users.findOne({ email: normalizeEmail(body.email) });
    if (!user) fail('user does not exist', HttpStatus.NOT_FOUND);

    const isMatch = await bcrypt.compare(body.password ?? '', user.password);
    if (!isMatch) fail('invalid credentials', HttpStatus.UNAUTHORIZED);

    this.webhooks.trigger('N8N_LOGIN_WEBHOOK', {
      name: user.name,
      email: user.email,
      time: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }),
    });
    return { success: true, token: signToken(user._id) };
  }

  async googleAuth(accessToken?: string) {
    if (!accessToken) fail('Google token missing');

    let profile: { email?: string; name?: string; picture?: string };
    try {
      const res = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        params: { access_token: accessToken },
      });
      profile = res.data;
    } catch {
      fail('Google verification failed', HttpStatus.UNAUTHORIZED);
    }
    const email = normalizeEmail(profile.email);
    if (!email) fail('Google verification failed', HttpStatus.UNAUTHORIZED);

    let user = await this.users.findOne({ email });
    if (!user) {
      // Google users never type a password, so give them a random one they can reset later.
      user = await new this.users({
        name: profile.name,
        email,
        password: await hash(crypto.randomBytes(16).toString('hex')),
        image: profile.picture,
      }).save();
    }
    return { success: true, token: signToken(user._id), name: user.name };
  }

  // --- profile ---

  async getProfile(userId: string) {
    const userData = await this.users.findById(userId).select('-password');
    if (!userData) fail('User not found', HttpStatus.NOT_FOUND);
    return { success: true, userData };
  }

  async updateProfile(
    userId: string,
    body: { name?: string; phone?: string; address?: string; dob?: string; gender?: string },
    imagePath?: string,
  ) {
    const { name, phone, address, dob, gender } = body;
    if (!name || !phone || !address || !dob || !gender) fail('Data Missing');

    await this.users.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });
    if (imagePath) {
      const image = await this.cloudinary.uploadImage(imagePath);
      await this.users.findByIdAndUpdate(userId, { image });
    }
    return { success: true, message: 'Profile Updated' };
  }

  // --- appointments ---

  async bookAppointment(userId: string, body: { docId?: string; slotDate?: string; slotTime?: string }) {
    const { docId, slotDate, slotTime } = body;
    if (!docId || !slotDate || !slotTime) fail('Missing booking details');

    const docData = await this.doctors.findById(docId).select('-password');
    if (!docData) fail('Doctor not found', HttpStatus.NOT_FOUND);
    if (!docData.available) fail('Doctor not available');

    const slotsBooked = docData.slots_booked ?? {};
    const dayBookings = slotsBooked[slotDate] ?? [];
    if (dayBookings.includes(slotTime)) fail('Slot not available');
    slotsBooked[slotDate] = [...dayBookings, slotTime];

    const userData = await this.users.findById(userId).select('-password');
    const appointment = await new this.appointments({
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    }).save();
    await this.doctors.findByIdAndUpdate(docId, { slots_booked: slotsBooked });

    this.webhooks.trigger('N8N_BOOKING_WEBHOOK', {
      name: userData?.name,
      email: userData?.email,
      doctor: docData.name,
      slot: `${slotDate.replace(/_/g, '/')} at ${slotTime}`,
    });
    return { success: true, message: 'Appointment Booked', appointmentId: appointment._id };
  }

  async listAppointments(userId: string) {
    const appointments = await this.appointments.find({ userId });
    return { success: true, appointments };
  }

  async cancelAppointment(userId: string, appointmentId?: string) {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) fail('Appointment not found', HttpStatus.NOT_FOUND);
    if (appointment.userId.toString() !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);

    await this.appointments.findByIdAndUpdate(appointmentId, { cancelled: true });
    await releaseSlot(this.doctors, appointment);

    this.webhooks.trigger('N8N_CANCEL_WEBHOOK', {
      patientName: appointment.userData?.name,
      patientEmail: appointment.userData?.email,
      doctorName: appointment.docData?.name,
      doctorEmail: appointment.docData?.email,
      slotDate: appointment.slotDate.replace(/_/g, '/'),
      slotTime: appointment.slotTime,
    });
    return { success: true, message: 'Appointment Canceled' };
  }

  async logDose(
    userId: string,
    body: { appointmentId?: string; medicineName?: string; overdoseAlert?: boolean },
  ) {
    const { appointmentId, medicineName, overdoseAlert } = body;
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) fail('Appointment not found', HttpStatus.NOT_FOUND);
    if (appointment.userId.toString() !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);
    if (!appointment.healthData?.prescribedMedicines) fail('No medication data found');

    const medicine = appointment.healthData.prescribedMedicines.find(
      (m) => m.name.toLowerCase() === (medicineName ?? '').toLowerCase(),
    );
    if (!medicine) fail('Medicine not found', HttpStatus.NOT_FOUND);
    if (medicine.remainingQuantity <= 0) fail('No doses left');

    const now = new Date();
    medicine.remainingQuantity -= 1;
    medicine.lastTaken = now;
    medicine.adherenceLogs = [...(medicine.adherenceLogs ?? []), now];

    if (overdoseAlert) {
      medicine.overdoseAlert = true;
      appointment.patientStatus = 'Critical';
      this.webhooks.trigger('N8N_OVERDOSE_WEBHOOK', {
        patientName: appointment.userData?.name,
        patientEmail: appointment.userData?.email,
        doctorEmail: appointment.docData?.email,
        doctorName: appointment.docData?.name,
        medicineName,
        appointmentId: appointment._id,
      });
    }
    if (medicine.remainingQuantity === 0) medicine.status = 'Completed';

    appointment.markModified('healthData.prescribedMedicines');
    // only validate what changed, so older records missing newer fields still save
    await appointment.save({ validateModifiedOnly: true });

    if (medicine.remainingQuantity > 0) {
      const intervalMs = hoursBetweenDoses(medicine) * 60 * 60 * 1000;
      const nextDoseTime = new Date(Date.now() + intervalMs);
      this.webhooks.trigger('N8N_DOSE_REMINDER_WEBHOOK', {
        patientName: appointment.userData?.name,
        patientEmail: appointment.userData?.email,
        medicineName: medicine.name,
        dosagePerDay: medicine.dosagePerDay,
        nextDoseTime: nextDoseTime.toISOString(),
        reminderAt30: new Date(nextDoseTime.getTime() - 30 * 60 * 1000).toISOString(),
        reminderAt5: new Date(nextDoseTime.getTime() - 5 * 60 * 1000).toISOString(),
        remainingQuantity: medicine.remainingQuantity,
        appointmentId: String(appointment._id),
        userId: appointment.userId.toString(),
      });
    }
    return {
      success: true,
      message: 'Dose logged successfully',
      remaining: medicine.remainingQuantity,
    };
  }

  // --- payments ---

  async startStripePayment(userId: string, appointmentId?: string) {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment || appointment.cancelled) fail('Invalid appointment');
    if (appointment.userId.toString() !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);

    const returnUrl = `${process.env.USER_URL}/verify?appointmentId=${appointmentId}`;
    const session = await this.stripe.checkout.sessions.create({
      success_url: `${returnUrl}&success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}&success=false`,
      metadata: { appointmentId: String(appointmentId) },
      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY || 'usd',
            product_data: { name: `Appointment with ${appointment.docData.name}` },
            unit_amount: Math.round(appointment.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
    });
    return { success: true, session_url: session.url };
  }

  async verifyStripePayment(
    userId: string,
    body: { appointmentId?: string; success?: string; session_id?: string },
  ) {
    const { appointmentId, success, session_id: sessionId } = body;
    if (success !== 'true') fail('Payment Failed');

    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) fail('Appointment not found', HttpStatus.NOT_FOUND);
    if (appointment.userId.toString() !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);

    // Ask Stripe whether this checkout was really paid, instead of trusting the URL.
    // Older web builds don't pass session_id yet; for those, keep the old behaviour.
    if (sessionId) {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      const paidForThis =
        session.payment_status === 'paid' && session.metadata?.appointmentId === String(appointmentId);
      if (!paidForThis) fail('Payment Failed');
    }

    await this.appointments.findByIdAndUpdate(appointmentId, { payment: true });
    return { success: true, message: 'Payment Successful' };
  }

  // --- account security ---

  async changePassword(userId: string, body: { oldPassword?: string; newPassword?: string }) {
    const user = await this.users.findById(userId);
    if (!user) fail('User not found', HttpStatus.NOT_FOUND);

    const isMatch = await bcrypt.compare(body.oldPassword ?? '', user.password);
    if (!isMatch) fail('Incorrect current password', HttpStatus.UNAUTHORIZED);
    if (!body.newPassword || body.newPassword.length < 8) fail('enter a strong password');

    user.password = await hash(body.newPassword);
    await user.save();
    return { success: true, message: 'Password updated' };
  }

  async forgotPassword(rawEmail?: string) {
    const email = normalizeEmail(rawEmail);
    const user = await this.users.findOne({ email });
    if (!user) fail('Email not found', HttpStatus.NOT_FOUND);

    const token = crypto.randomBytes(40).toString('hex');
    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    await this.mail.send({
      to: email,
      subject: 'Reset Password',
      html: `<a href="${process.env.CLIENT_URL}/reset-password/${token}">Reset Link</a>`,
    });
    return { success: true, message: 'Reset link sent' };
  }

  async resetPassword(body: { token?: string; newPassword?: string }) {
    const user = await this.users.findOne({
      resetToken: body.token,
      resetTokenExpire: { $gt: Date.now() },
    });
    if (!body.token || !user) fail('Invalid/Expired token');
    if (!body.newPassword || body.newPassword.length < 8) fail('enter a strong password');

    user.password = await hash(body.newPassword);
    user.resetToken = '';
    user.resetTokenExpire = 0;
    await user.save();
    return { success: true, message: 'Password reset successful' };
  }

  async deleteAccount(userId: string) {
    await this.users.findByIdAndDelete(userId);
    await this.appointments.deleteMany({ userId });
    return { success: true, message: 'Account permanently deleted' };
  }
}

/** Frees the appointment's time in the doctor's diary so someone else can book it. */
export async function releaseSlot(doctors: Model<IDoctor>, appointment: IAppointment) {
  const doctor = await doctors.findById(appointment.docId);
  const dayBookings = doctor?.slots_booked?.[appointment.slotDate];
  if (!doctor || !dayBookings) return;

  doctor.slots_booked[appointment.slotDate] = dayBookings.filter((t) => t !== appointment.slotTime);
  await doctors.findByIdAndUpdate(appointment.docId, { slots_booked: doctor.slots_booked });
}
