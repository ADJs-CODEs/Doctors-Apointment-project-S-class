import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import {
  hoursBetweenDoses,
  type IAppointment,
  type IMedicine,
} from '../database/schemas/appointment.schema';
import type { IDoctor } from '../database/schemas/doctor.schema';
import type { IChatMessage } from '../database/schemas/social.schemas';
import type { IUser } from '../database/schemas/user.schema';
import { RealtimeGateway } from '../integrations/realtime.gateway';
import { AppNotifier } from '../notifications/app-notifier';
import { EmailNotifications } from '../notifications/email-notifications';

type Side = 'patient' | 'doctor';
type SendBody = { text?: string; appointmentId?: string; medicineName?: string; urgent?: boolean };

const HOUR = 60 * 60 * 1000;
const PAGE_SIZE = 200;

/** "21_3_2026" + "10:30 am" -> Date, or null. */
function slotToDate(slotDate: string, slotTime: string): Date | null {
  const [day, month, year] = (slotDate ?? '').split('_').map(Number);
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec((slotTime ?? '').trim());
  if (!day || !month || !year || !match) return null;
  let hours = Number(match[1]) % 12;
  if (match[3].toLowerCase() === 'pm') hours += 12;
  return new Date(year, month - 1, day, hours, Number(match[2]));
}

/**
 * Where a medicine stands, for the doctor's view. Same rules as the patient app:
 * a 1h grace window after a dose is due, and a course left untouched for longer than
 * its remaining doses would take counts as stopped rather than missed.
 */
function medicineSummary(med: IMedicine, prescribedAt: Date | null, now = Date.now()) {
  const gap = hoursBetweenDoses(med) * HOUR;
  const restOfCourse = med.remainingQuantity * gap + 24 * HOUR;
  const total = med.totalQuantity || 1;
  const base = {
    name: med.name,
    schedule:
      med.frequencyType === 'interval' ? `every ${med.dosagePerDay} hours` : `${med.dosagePerDay}× daily`,
    totalQuantity: med.totalQuantity,
    remainingQuantity: med.remainingQuantity,
    adherence: Math.min(100, Math.round(((total - med.remainingQuantity) / total) * 100)),
    lastTaken: med.lastTaken ?? null,
    overdoseAlert: !!med.overdoseAlert,
  };

  let status: 'finished' | 'stopped' | 'not-started' | 'on-track' | 'due' | 'missed';
  let missedDoses = 0;
  if (med.status === 'Completed' || med.remainingQuantity <= 0) status = 'finished';
  else if (!med.lastTaken) {
    status = prescribedAt && now - prescribedAt.getTime() > restOfCourse ? 'stopped' : 'not-started';
  } else {
    const overdue = now - (new Date(med.lastTaken).getTime() + gap);
    if (overdue < 0) status = 'on-track';
    else if (overdue <= HOUR) status = 'due';
    else if (overdue > restOfCourse) status = 'stopped';
    else {
      status = 'missed';
      missedDoses = Math.min(1 + Math.floor(overdue / gap), med.remainingQuantity);
    }
  }
  return { ...base, status, missedDoses };
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger('MessagesService');

  constructor(
    @InjectModel(MODEL.chatMessage) private readonly messages: Model<IChatMessage>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    private readonly notifier: AppNotifier,
    private readonly emails: EmailNotifications,
    private readonly realtime: RealtimeGateway,
  ) {}

  // --- shared ---

  /** A patient and a doctor can chat once they have a booking together that wasn't cancelled. */
  private async assertCanChat(docId: string, userId: string) {
    if (!isValidObjectId(docId) || !isValidObjectId(userId)) fail('Conversation not found', HttpStatus.NOT_FOUND);
    const booked = await this.appointments.exists({ docId, userId, cancelled: false });
    if (!booked) fail('You can message a doctor once you have an appointment with them', HttpStatus.FORBIDDEN);
  }

  /** Last message and unread counts for each conversation of one doctor or patient. */
  private async summaries(side: Side, id: string) {
    const mine = side === 'patient' ? 'userId' : 'doctorId';
    const other = side === 'patient' ? '$doctorId' : '$userId';
    const fromOther = side === 'patient' ? 'doctor' : 'patient';
    const rows = await this.messages.aggregate<{
      _id: string;
      last: IChatMessage;
      unread: number;
      urgentUnread: number;
    }>([
      { $match: { [mine]: id } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: other,
          last: { $last: '$$ROOT' },
          unread: {
            $sum: { $cond: [{ $and: [{ $eq: ['$sender', fromOther] }, { $eq: ['$readAt', null] }] }, 1, 0] },
          },
          urgentUnread: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$sender', fromOther] }, { $eq: ['$readAt', null] }, '$urgent'] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
    return new Map(rows.map((r) => [r._id, r]));
  }

  private async send(
    side: Side,
    docId: string,
    userId: string,
    body: SendBody,
  ): Promise<IChatMessage> {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) fail('Message is empty');
    if (text.length > 4000) fail('Message is too long');

    // context must belong to this doctor/patient pair
    let appointment: IAppointment | null = null;
    if (body.appointmentId) {
      if (!isValidObjectId(body.appointmentId)) fail('Appointment not found', HttpStatus.NOT_FOUND);
      appointment = await this.appointments.findOne({ _id: body.appointmentId, docId, userId });
      if (!appointment) fail('Appointment not found', HttpStatus.NOT_FOUND);
    }
    const medicineName =
      appointment && typeof body.medicineName === 'string'
        ? appointment.healthData?.prescribedMedicines?.find((m) => m.name === body.medicineName)?.name
        : undefined;

    const urgent = side === 'doctor' && !!body.urgent;
    const sentAt = new Date();
    let legacyKey: string | undefined;

    // Doctor messages about a visit also go on the appointment itself, where the mobile
    // app reads them. legacyKey ties the two copies together so the startup copy
    // (LegacyMessageCopier) doesn't duplicate it.
    if (side === 'doctor' && appointment) {
      appointment.messages.push({ sender: 'Doctor', content: text, sentAt, isRead: false });
      if (urgent) appointment.patientStatus = 'Critical';
      if (urgent) appointment.lastWarningSent = sentAt;
      await appointment.save();
      legacyKey = `${appointment._id}:${sentAt.getTime()}`;
    }

    const message = await this.messages.create({
      doctorId: docId,
      userId,
      sender: side,
      text,
      urgent,
      appointmentId: appointment?._id?.toString(),
      medicineName,
      legacyKey,
      createdAt: sentAt,
    });

    const recipient: Side = side === 'patient' ? 'doctor' : 'patient';
    const payload = message.toObject();
    this.realtime.emitTo(recipient, recipient === 'doctor' ? docId : userId, 'chat_message', payload);
    this.realtime.emitTo(side, side === 'doctor' ? docId : userId, 'chat_message', payload); // other tabs

    if (side === 'doctor') await this.notifyPatient(docId, userId, text, urgent, String(message._id));
    return message;
  }

  /**
   * Puts an alert sent through the old send-alert endpoint into the chat. That endpoint
   * already saved it on the appointment, so this adds the chat copy, the live push, and
   * the notifications/emails like any other doctor message.
   */
  async recordAlert(appointment: IAppointment, text: string, sentAt: Date, urgent: boolean) {
    try {
      const message = await this.messages.create({
        doctorId: appointment.docId,
        userId: appointment.userId,
        sender: 'doctor',
        text,
        urgent,
        appointmentId: String(appointment._id),
        legacyKey: `${appointment._id}:${sentAt.getTime()}`,
        createdAt: sentAt,
      });
      const payload = message.toObject();
      this.realtime.emitTo('patient', appointment.userId, 'chat_message', payload);
      this.realtime.emitTo('doctor', appointment.docId, 'chat_message', payload);
      await this.notifyPatient(appointment.docId, appointment.userId, text, urgent, String(message._id));
    } catch (err: any) {
      // the alert itself is saved; the startup copy will pick it up next time
      this.logger.error(`couldn't add alert to chat: ${err.message}`);
    }
  }

  /**
   * In-app notification for every doctor message. Email: always for urgent ones; for
   * normal ones only if the patient hasn't already been emailed about an unread message
   * from this doctor in the last hour, so a back-and-forth doesn't flood their inbox.
   */
  private async notifyPatient(docId: string, userId: string, text: string, urgent: boolean, messageId: string) {
    const [doctor, user] = await Promise.all([
      this.doctors.findById(docId).select(['name', 'email']),
      this.users.findById(userId).select(['name', 'email']),
    ]);
    const doctorName = doctor?.name ?? 'Your doctor';
    // bell + live + device notification for every doctor message (like any chat app)
    this.notifier.send(userId, {
      title: urgent ? `Urgent message from ${doctorName}` : `New message from ${doctorName}`,
      message: text.length > 140 ? `${text.slice(0, 140)}…` : text,
      type: urgent ? 'alert' : 'message',
      link: `/messages?doctor=${docId}`,
      tag: `chat-${docId}`,
      urgent,
    });

    if (!user?.email) return;
    const from = { _id: docId, name: doctorName, email: doctor?.email };
    const to = { _id: userId, name: user.name, email: user.email };
    if (urgent) {
      this.emails.urgentMessage(to, from, text);
      return;
    }
    const recentUnread = await this.messages.exists({
      doctorId: docId,
      userId,
      sender: 'doctor',
      readAt: null,
      _id: { $ne: messageId },
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (!recentUnread) this.emails.doctorMessage(to, from, text);
  }

  private async markRead(side: Side, docId: string, userId: string) {
    const fromOther = side === 'patient' ? 'doctor' : 'patient';
    const result = await this.messages.updateMany(
      { doctorId: docId, userId, sender: fromOther, readAt: null },
      { readAt: new Date() },
    );
    if (result.modifiedCount) {
      // lets the sender see "Read" and the reader's other tabs clear their badges
      const event = { doctorId: docId, userId, readBy: side };
      this.realtime.emitTo('doctor', docId, 'chat_read', event);
      this.realtime.emitTo('patient', userId, 'chat_read', event);
    }
  }

  private thread(docId: string, userId: string) {
    return this.messages
      .find({ doctorId: docId, userId })
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .select('-legacyKey')
      .lean()
      .then((rows) => rows.reverse());
  }

  // --- patient side ---

  async patientConversations(userId: string) {
    const docIds = await this.appointments.distinct('docId', { userId, cancelled: false });
    const [doctors, summaries] = await Promise.all([
      this.doctors.find({ _id: { $in: docIds } }).select(['name', 'image', 'speciality']).lean(),
      this.summaries('patient', userId),
    ]);
    const conversations = doctors
      .map((d) => {
        const s = summaries.get(String(d._id));
        return {
          doctor: { _id: String(d._id), name: d.name, image: d.image, speciality: d.speciality },
          lastMessage: s?.last ?? null,
          unread: s?.unread ?? 0,
          urgentUnread: s?.urgentUnread ?? 0,
        };
      })
      .sort(byLatest);
    return { success: true, conversations };
  }

  async patientThread(userId: string, docId: string) {
    await this.assertCanChat(docId, userId);
    const [doctor, visits, messages] = await Promise.all([
      this.doctors.findById(docId).select(['name', 'image', 'speciality']).lean(),
      this.appointments
        .find({ docId, userId, cancelled: false })
        .select(['slotDate', 'slotTime', 'isCompleted', 'healthData.prescribedMedicines.name'])
        .lean(),
      this.thread(docId, userId),
    ]);
    await this.markRead('patient', docId, userId);
    return {
      success: true,
      doctor: doctor && { _id: String(doctor._id), name: doctor.name, image: doctor.image, speciality: doctor.speciality },
      visits: visits.map((v) => ({
        _id: String(v._id),
        slotDate: v.slotDate,
        slotTime: v.slotTime,
        isCompleted: v.isCompleted,
        medicines: (v.healthData?.prescribedMedicines ?? []).map((m) => m.name),
      })),
      messages,
    };
  }

  async patientSend(userId: string, docId: string, body: SendBody) {
    await this.assertCanChat(docId, userId);
    const message = await this.send('patient', docId, userId, body);
    return { success: true, message };
  }

  async patientRead(userId: string, docId: string) {
    await this.assertCanChat(docId, userId);
    await this.markRead('patient', docId, userId);
    return { success: true };
  }

  async patientUnread(userId: string) {
    const [unread, urgent] = await Promise.all([
      this.messages.countDocuments({ userId, sender: 'doctor', readAt: null }),
      this.messages.countDocuments({ userId, sender: 'doctor', readAt: null, urgent: true }),
    ]);
    return { success: true, unread, urgent };
  }

  // --- doctor side ---

  async doctorConversations(docId: string) {
    const visits = await this.appointments
      .find({ docId, cancelled: false })
      .select(['userId', 'patientStatus'])
      .lean();
    const userIds = [...new Set(visits.map((v) => v.userId))];
    const critical = new Set(visits.filter((v) => v.patientStatus === 'Critical').map((v) => v.userId));

    const [users, summaries] = await Promise.all([
      this.users.find({ _id: { $in: userIds } }).select(['name', 'image']).lean(),
      this.summaries('doctor', docId),
    ]);
    const conversations = users
      .map((u) => {
        const s = summaries.get(String(u._id));
        return {
          patient: { _id: String(u._id), name: u.name, image: u.image },
          critical: critical.has(String(u._id)),
          lastMessage: s?.last ?? null,
          unread: s?.unread ?? 0,
        };
      })
      .sort(byLatest);
    return { success: true, conversations };
  }

  /** The thread plus everything the doctor needs to know about this patient. */
  async doctorThread(docId: string, userId: string) {
    await this.assertCanChat(docId, userId);
    const [patient, visits, messages] = await Promise.all([
      this.users.findById(userId).select(['name', 'image', 'email', 'phone', 'gender', 'dob']).lean(),
      this.appointments.find({ docId, userId }).lean(),
      this.thread(docId, userId),
    ]);
    await this.markRead('doctor', docId, userId);

    const now = Date.now();
    const context = visits
      .map((v) => {
        const at = slotToDate(v.slotDate, v.slotTime);
        return {
          _id: String(v._id),
          slotDate: v.slotDate,
          slotTime: v.slotTime,
          at,
          status: v.cancelled ? 'cancelled' : v.isCompleted ? 'completed' : 'upcoming',
          patientStatus: v.patientStatus,
          payment: v.payment,
          vitals: {
            heartRate: v.healthData?.heartRate ?? '',
            bloodPressure: v.healthData?.bloodPressure ?? '',
            temperature: v.healthData?.temperature ?? '',
          },
          doctorNotes: v.healthData?.doctorNotes ?? '',
          medicines: (v.healthData?.prescribedMedicines ?? []).map((m) => medicineSummary(m, at, now)),
        };
      })
      .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));

    return {
      success: true,
      patient: patient && {
        _id: String(patient._id),
        name: patient.name,
        image: patient.image,
        email: patient.email,
        phone: patient.phone,
        gender: patient.gender,
        dob: patient.dob,
      },
      critical: visits.some((v) => !v.cancelled && v.patientStatus === 'Critical'),
      visits: context,
      messages,
    };
  }

  async doctorSend(docId: string, userId: string, body: SendBody) {
    await this.assertCanChat(docId, userId);
    const message = await this.send('doctor', docId, userId, body);
    return { success: true, message };
  }

  async doctorRead(docId: string, userId: string) {
    await this.assertCanChat(docId, userId);
    await this.markRead('doctor', docId, userId);
    return { success: true };
  }

  async doctorUnread(docId: string) {
    const unread = await this.messages.countDocuments({ doctorId: docId, sender: 'patient', readAt: null });
    return { success: true, unread };
  }
}

const byLatest = (a: { lastMessage: { createdAt: Date } | null }, b: { lastMessage: { createdAt: Date } | null }) =>
  new Date(b.lastMessage?.createdAt ?? 0).getTime() - new Date(a.lastMessage?.createdAt ?? 0).getTime();

