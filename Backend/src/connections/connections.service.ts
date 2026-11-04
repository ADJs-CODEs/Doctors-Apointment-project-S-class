import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IConnection, INudge } from '../database/schemas/social.schemas';
import type { IUser } from '../database/schemas/user.schema';
import { AppNotifier } from '../notifications/app-notifier';
import { EmailNotifications } from '../notifications/email-notifications';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ready-made nudges (the app shows these as buttons); "custom" carries the sender's own words. */
export const NUDGES = {
  love: '❤️ Thinking of you',
  medicine: '💊 Have you taken your medicine?',
  checkin: '🙂 How are you feeling today?',
  water: '💧 Remember to drink some water',
  rest: '🛌 Get some rest, okay?',
  call: '📞 Call me when you can',
  okay: "✅ I'm okay, don't worry",
  thanks: '🙏 Thank you for checking on me',
} as const;
type NudgeKind = keyof typeof NUDGES | 'custom';
const NUDGE_GAP_MS = 60_000; // at most one a minute to the same person
const NUDGES_PER_DAY = 20; // and 20 a day, so nobody's phone gets flooded

// "Watching over": a person (requester) asks to follow a patient's health data;
// the patient accepts or rejects. Accepted watchers get read-only access.
@Injectable()
export class ConnectionsService {
  constructor(
    @InjectModel(MODEL.connection) private readonly connections: Model<IConnection>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    @InjectModel(MODEL.nudge) private readonly nudges: Model<INudge>,
    private readonly emails: EmailNotifications,
    private readonly notifier: AppNotifier,
  ) {}

  /**
   * A caregiver nudges the person they watch over (or the patient replies to a caregiver):
   * it lands in their bell, on their open screen and on their phone, even with the app closed.
   * Phone pushes follow their "Care circle" setting and quiet hours.
   */
  async nudge(fromUserId: string, body: { toUserId?: string; kind?: string; text?: unknown }) {
    const toUserId = typeof body.toUserId === 'string' ? body.toUserId : '';
    const kind = (body.kind && (body.kind in NUDGES || body.kind === 'custom') ? body.kind : '') as NudgeKind | '';
    if (!toUserId || !kind) fail('Pick a nudge to send');
    const text = kind === 'custom' ? (typeof body.text === 'string' ? body.text.trim().slice(0, 160) : '') : NUDGES[kind];
    if (!text) fail('Write a short message');

    // either direction of an accepted connection, like emoji pings
    const connection = await this.connections
      .findOne({ status: 'accepted', $or: [{ requesterId: fromUserId, patientId: toUserId }, { requesterId: toUserId, patientId: fromUserId }] })
      .select(['requesterId']);
    if (!connection) fail('You can only nudge people in your care circle', HttpStatus.FORBIDDEN);

    const [last, today] = await Promise.all([
      this.nudges.findOne({ fromUserId, toUserId }).sort({ createdAt: -1 }).select('createdAt').lean(),
      this.nudges.countDocuments({ fromUserId, toUserId, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60_000) } }),
    ]);
    if (last && Date.now() - new Date(last.createdAt).getTime() < NUDGE_GAP_MS) fail('Give it a minute before sending another');
    if (today >= NUDGES_PER_DAY) fail("That's plenty for today. They know you care ❤️");

    const fromName = (await this.users.findById(fromUserId).select('name').lean())?.name || 'Someone';
    await this.nudges.create({ fromUserId, toUserId, fromName, kind, text });
    // a caregiver opens the patient's page (/watching/:id); a patient opens their care circle
    const recipientIsCaregiver = connection.requesterId === toUserId;
    this.notifier.send(toUserId, {
      title: `${fromName} sent you a nudge`,
      message: text,
      type: 'care',
      category: 'careCircle',
      link: recipientIsCaregiver ? `/watching/${fromUserId}` : '/watching-over',
      tag: `nudge-${fromUserId}`,
    });
    return { success: true, message: `Sent to them: "${text}"` };
  }

  /** Recent nudges between me and one person, both ways (newest first). */
  async nudgeHistory(userId: string, otherId?: string) {
    if (!otherId) fail('Missing person');
    const nudges = await this.nudges
      .find({ $or: [{ fromUserId: userId, toUserId: otherId }, { fromUserId: otherId, toUserId: userId }] })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return { success: true, nudges: nudges.map((n) => ({ ...n, mine: n.fromUserId === userId })), kinds: NUDGES };
  }

  async request(requesterId: string, patientEmail?: string) {
    if (!patientEmail) fail('Patient email required');

    const patient = await this.users.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(patientEmail.trim())}$`, 'i') },
    });
    if (!patient) fail('No user found with that email', HttpStatus.NOT_FOUND);
    const patientId = patient._id.toString();
    if (patientId === requesterId) fail("You can't connect to yourself");

    const existing = await this.connections.findOne({ requesterId, patientId });
    if (existing?.status === 'pending') fail('Request already sent');
    if (existing?.status === 'accepted') fail('Already connected');
    const resent = existing?.status === 'rejected';
    if (existing && resent) {
      existing.status = 'pending';
      await existing.save();
    } else {
      try {
        await new this.connections({ requesterId, patientId }).save();
      } catch (err: any) {
        if (err.code === 11000) fail('Request already exists');
        throw err;
      }
    }

    const requester = await this.users.findById(requesterId).select('name email');
    if (requester) this.emails.careRequest(patient, requester);
    return { success: true, message: resent ? 'Connection request re-sent' : 'Connection request sent' };
  }

  async respond(userId: string, body: { connectionId?: string; action?: string }) {
    const { connectionId, action } = body;
    if (action !== 'accepted' && action !== 'rejected') fail('Invalid action');

    const connection = await this.connections.findById(connectionId);
    if (!connection) fail('Request not found', HttpStatus.NOT_FOUND);
    if (connection.patientId !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);

    connection.status = action;
    await connection.save();

    const [requester, patient] = await Promise.all([
      this.users.findById(connection.requesterId).select('email name'),
      this.users.findById(userId).select('email name'),
    ]);
    if (requester && patient) this.emails.careResponse(patient, requester, userId, action === 'accepted');
    return { success: true, message: `Request ${action}` };
  }

  async pendingRequests(userId: string) {
    const pending = await this.connections.find({ patientId: userId, status: 'pending' });
    const requests = await Promise.all(
      pending.map(async (conn) => ({
        ...conn.toObject(),
        requester: await this.users.findById(conn.requesterId).select('name email image'),
      })),
    );
    return { success: true, requests };
  }

  async watchingOver(userId: string) {
    const accepted = await this.connections.find({ requesterId: userId, status: 'accepted' });
    const watching = await Promise.all(
      accepted.map(async (conn) => ({
        ...conn.toObject(),
        patient: await this.users.findById(conn.patientId).select('name email image phone'),
      })),
    );
    return { success: true, watching };
  }

  async watchers(userId: string) {
    const accepted = await this.connections.find({ patientId: userId, status: 'accepted' });
    const watchers = await Promise.all(
      accepted.map(async (conn) => ({
        ...conn.toObject(),
        watcher: await this.users.findById(conn.requesterId).select('name email image'),
      })),
    );
    return { success: true, watchers };
  }

  async remove(userId: string, connectionId?: string) {
    const connection = await this.connections.findById(connectionId);
    if (!connection) fail('Connection not found', HttpStatus.NOT_FOUND);
    // either side can end the connection
    if (connection.patientId !== userId && connection.requesterId !== userId) {
      fail('Unauthorized', HttpStatus.FORBIDDEN);
    }
    await this.connections.findByIdAndDelete(connectionId);

    // tell the other person, unless it was only a pending request
    if (connection.status === 'accepted') {
      const byPatient = connection.patientId === userId;
      const [me, other] = await Promise.all([
        this.users.findById(userId).select('name email'),
        this.users.findById(byPatient ? connection.requesterId : connection.patientId).select('name email'),
      ]);
      if (me && other) this.emails.careRemoved(other, me, byPatient ? 'patient' : 'watcher');
    }
    return { success: true, message: 'Connection removed' };
  }

  async patientData(watcherId: string, patientId: string) {
    const connection = await this.connections.findOne({
      requesterId: watcherId,
      patientId,
      status: 'accepted',
    });
    if (!connection) fail('No active connection with this patient', HttpStatus.FORBIDDEN);

    const [patient, appointments] = await Promise.all([
      this.users.findById(patientId).select('-password -resetToken -resetTokenExpire -settings -googleCalendar'),
      this.appointments.find({ userId: patientId }).sort({ date: -1 }),
    ]);
    return { success: true, patient, appointments };
  }
}
