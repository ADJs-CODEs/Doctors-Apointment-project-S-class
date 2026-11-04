import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type {
  IConnection,
  IEmojiPing,
  INotification,
  IWishWell,
} from '../database/schemas/social.schemas';
import type { IUser } from '../database/schemas/user.schema';
import { PATIENT_AUDIENCE } from '../database/schemas/social.schemas';
import { RealtimeGateway } from '../integrations/realtime.gateway';
import { AppNotifier } from '../notifications/app-notifier';

const EMOJI_KEYS: Record<string, keyof IWishWell['emojiCounts']> = {
  '❤️': 'heart',
  '🌸': 'flower',
  '👏': 'clap',
  '⭐': 'star',
  '🙏': 'prayer',
};
const isValidEmoji = (emoji: unknown): emoji is string =>
  typeof emoji === 'string' && emoji in EMOJI_KEYS;

/** What the public, the emoji button and gifts may see: accepted, not opted out, not hidden. */
export const LIVE_ON_WISH_WELL = { consentGiven: true, optedOut: false, hidden: { $ne: true } };
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Wish Well: doctors (or the admin, on a doctor's behalf) put forward critically ill patients;
// the patient must accept before anything about them is public. The community sends
// encouragement emojis and gifts; when the patient recovers, the emojis stop.
@Injectable()
export class WishWellService {
  constructor(
    @InjectModel(MODEL.wishWell) private readonly entries: Model<IWishWell>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly realtime: RealtimeGateway,
    private readonly notifier: AppNotifier,
  ) {}

  async publicEntries() {
    const entries = await this.entries.find(LIVE_ON_WISH_WELL).sort({ status: 1, createdAt: -1 });
    return { success: true, entries };
  }

  /** A doctor's own nominations, including ones still waiting for the patient. */
  async doctorEntries(docId: string) {
    const entries = await this.entries.find({ doctorId: docId }).sort({ createdAt: -1 });
    return { success: true, entries };
  }

  /**
   * Puts a patient forward. It stays private ("waiting for the patient") until they accept;
   * they're told in the app. The doctor must have seen them.
   */
  async nominate(docId: string, body: { patientId?: string; condition?: string; story?: string }, by: 'doctor' | 'admin' = 'doctor') {
    const patientId = clean(body.patientId, 40);
    const condition = clean(body.condition, 120);
    const story = clean(body.story, 2000);
    if (!patientId || !condition || !story) fail('Fill in the condition and the story');
    if (!isValidObjectId(patientId)) fail('Patient not found', HttpStatus.NOT_FOUND);

    const patient = await this.users.findById(patientId).select('name image');
    if (!patient) fail('Patient not found', HttpStatus.NOT_FOUND);

    // the doctor named must actually be treating them
    const appointment = await this.appointments.findOne({ docId, userId: patientId }).select('docData.name');
    if (!appointment) fail(by === 'admin' ? "That doctor hasn't seen this patient" : 'You can only nominate your own patients', HttpStatus.FORBIDDEN);

    if (await this.entries.exists({ patientId, optedOut: true })) fail('This patient has opted out of the Wish Well');
    if (await this.entries.exists({ patientId, status: 'critical' })) fail('This patient is already on the Wish Well, or has been asked');

    const doctorName = appointment.docData?.name || 'Your doctor';
    const entry = await new this.entries({
      patientId,
      patientName: patient.name,
      patientImage: patient.image,
      doctorId: docId,
      doctorName,
      condition,
      story,
      consentGiven: false,
      nominatedBy: by,
    }).save();
    this.notifier.send(patientId, {
      title: 'Would you like to join the Wish Well?',
      message: `${doctorName} would like the community to send you encouragement. Nothing is shared until you say yes.`,
      type: 'care',
      link: '/wish-well',
    });
    return { success: true, message: `Sent to ${patient.name} to accept. Nothing is public until they do.`, entry };
  }

  /** The patient's answer. Declining deletes it; accepting makes it public. */
  async giveConsent(userId: string, body: { entryId?: string; accept?: boolean }) {
    if (!body.entryId || !isValidObjectId(body.entryId)) fail('Entry not found', HttpStatus.NOT_FOUND);
    const entry = await this.entries.findById(body.entryId);
    if (!entry) fail('Entry not found', HttpStatus.NOT_FOUND);
    if (entry.patientId !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);
    if (entry.consentGiven) return { success: true, message: "You're already on the Wish Well" };

    if (!body.accept) {
      await this.entries.findByIdAndDelete(body.entryId);
      this.notifier.toDoctor(entry.doctorId, { title: 'Wish Well declined', message: `${entry.patientName} chose not to join the Wish Well.`, type: 'care', link: '/doctor-wish-well' });
      return { success: true, message: "No problem, you won't be added" };
    }
    entry.consentGiven = true;
    await entry.save();
    this.notifier.toDoctor(entry.doctorId, { title: 'Wish Well accepted', message: `${entry.patientName} is now on the Wish Well.`, type: 'care', link: '/doctor-wish-well' });
    return { success: true, message: "You're on the Wish Well. The community can now send you love." };
  }

  async optOut(userId: string) {
    await this.entries.updateMany({ patientId: userId }, { optedOut: true });
    return { success: true, message: 'Opted out successfully' };
  }

  async pendingConsent(userId: string) {
    const pending = await this.entries.find({ patientId: userId, consentGiven: false, optedOut: false });
    return { success: true, pending };
  }

  async sendEmoji(body: { entryId?: string; emoji?: string }) {
    const { entryId, emoji } = body;
    if (!isValidEmoji(emoji)) fail('Invalid emoji');

    if (!entryId || !isValidObjectId(entryId)) fail('Entry not found', HttpStatus.NOT_FOUND);
    const entry = await this.entries.findOne({ _id: entryId, ...LIVE_ON_WISH_WELL });
    if (!entry) fail('Entry not found', HttpStatus.NOT_FOUND);
    if (entry.status !== 'critical') fail('Patient has been updated — emojis disabled');

    await this.entries.findByIdAndUpdate(entryId, {
      $inc: { [`emojiCounts.${EMOJI_KEYS[emoji]}`]: 1, totalEmojis: 1 },
    });
    this.realtime.sendEmojiToUser(entry.patientId, {
      emoji,
      fromName: 'The Community',
      isWishWell: true,
    });
    return { success: true, message: 'Emoji sent' };
  }

  /** Recovered or passed. The admin can do it for any entry (docId = null), e.g. if the doctor has left. */
  async updateStatus(docId: string | null, body: { entryId?: string; status?: string }) {
    const { entryId, status } = body;
    if (status !== 'recovered' && status !== 'passed') fail('Invalid status');

    if (!entryId || !isValidObjectId(entryId)) fail('Entry not found', HttpStatus.NOT_FOUND);
    const entry = await this.entries.findById(entryId);
    if (!entry) fail('Entry not found', HttpStatus.NOT_FOUND);
    if (docId !== null && entry.doctorId !== docId) fail('Unauthorized', HttpStatus.FORBIDDEN);
    if (!entry.consentGiven) fail("The patient hasn't accepted yet; remove the request instead");

    entry.status = status;
    await entry.save();

    if (status === 'recovered') {
      this.realtime.sendEmojiToUser(entry.patientId, {
        emoji: '🎉',
        fromName: "ADJ's CODEs",
        isCongratulations: true,
        message: `You've recovered! The community sent you ${entry.totalEmojis} wishes of love. 💕`,
      });
    }
    return { success: true, message: `Status updated to ${status}` };
  }

  /** Deletes an entry. docId = null for the admin. */
  async remove(docId: string | null, entryId?: string) {
    if (!entryId || !isValidObjectId(entryId)) fail('Entry not found', HttpStatus.NOT_FOUND);
    const entry = await this.entries.findById(entryId);
    if (!entry) fail('Entry not found', HttpStatus.NOT_FOUND);
    if (docId !== null && entry.doctorId !== docId) fail('Unauthorized', HttpStatus.FORBIDDEN);

    await this.entries.findByIdAndDelete(entryId);
    return { success: true, message: 'Removed from Wish Well' };
  }

  // --- the admin ---

  /** Every entry, with what state it's in, for the admin's Wish Well page. */
  async adminList() {
    const entries = await this.entries.find({}).sort({ createdAt: -1 }).limit(500).lean();
    return { success: true, entries };
  }

  /** Patients the admin can put forward, each with the doctors who've seen them. */
  async candidates(query?: string) {
    const q = clean(query, 60);
    const filter = q ? { $or: [{ name: { $regex: escapeRegex(q), $options: 'i' } }, { email: { $regex: escapeRegex(q), $options: 'i' } }] } : {};
    const users = await this.users.find(filter).select(['name', 'email', 'image']).limit(20).lean();
    const ids = users.map((u) => String(u._id));
    const seen = await this.appointments.aggregate<{ _id: { userId: string; docId: string }; name: string }>([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: { userId: '$userId', docId: '$docId' }, name: { $last: '$docData.name' } } },
    ]);
    const onWell = new Set(
      (await this.entries.find({ patientId: { $in: ids }, $or: [{ status: 'critical' }, { optedOut: true }] }).select('patientId').lean()).map((e) => e.patientId),
    );
    return {
      success: true,
      patients: users
        .map((u) => ({
          _id: String(u._id),
          name: u.name,
          email: u.email,
          image: u.image,
          unavailable: onWell.has(String(u._id)),
          doctors: seen.filter((s) => s._id.userId === String(u._id)).map((s) => ({ _id: s._id.docId, name: s.name ?? 'Doctor' })),
        }))
        // only patients who have a doctor to nominate them through
        .filter((p) => p.doctors.length),
    };
  }

  /** Fix the wording (the patient's condition and story). */
  async adminEdit(entryId: string, body: { condition?: unknown; story?: unknown }) {
    if (!isValidObjectId(entryId)) fail('Entry not found', HttpStatus.NOT_FOUND);
    const condition = clean(body.condition, 120);
    const story = clean(body.story, 2000);
    if (!condition || !story) fail('The condition and story can’t be empty');
    const done = await this.entries.updateOne({ _id: entryId }, { $set: { condition, story } });
    if (!done.matchedCount) fail('Entry not found', HttpStatus.NOT_FOUND);
    return { success: true, message: 'Saved' };
  }

  /** Take it off the public Wish Well (or put it back). Nothing is deleted. */
  async adminHide(entryId: string, body: { hidden?: boolean; reason?: unknown }) {
    if (!isValidObjectId(entryId)) fail('Entry not found', HttpStatus.NOT_FOUND);
    const hide = body.hidden !== false;
    const reason = clean(body.reason, 300);
    if (hide && !reason) fail('Say why it’s hidden (only the clinic sees this)');
    const done = await this.entries.updateOne(
      { _id: entryId },
      hide ? { $set: { hidden: true, hiddenReason: reason } } : { $unset: { hidden: 1, hiddenReason: 1 } },
    );
    if (!done.matchedCount) fail('Entry not found', HttpStatus.NOT_FOUND);
    return { success: true, message: hide ? 'Hidden from the Wish Well' : 'Back on the Wish Well' };
  }
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(MODEL.notification) private readonly notifications: Model<INotification>) {}

  // Unauthenticated: n8n dose reminders used to post here. Those now run in-process
  // (notifications/dose-reminders.ts), so nothing internal needs this anymore.
  async create(body: { userId?: string; title?: string; message?: string; type?: string }) {
    const { userId, title, message, type } = body;
    if (!userId || !title || !message) fail('Missing fields');
    const notification = await new this.notifications({
      userId,
      title,
      message,
      type: type || 'general',
    }).save();
    return { success: true, notification };
  }

  // The same methods serve both bells: patients (default) and doctors (audience 'doctor').
  // Every query is scoped to the owner AND the audience, so one bell never touches the other.

  async list(userId: string, audience: 'patient' | 'doctor' = 'patient') {
    const notifications = await this.notifications
      .find({ userId, ...scope(audience) })
      .sort({ createdAt: -1 })
      .limit(audience === 'doctor' ? 30 : 20);
    return { success: true, notifications };
  }

  async markAllRead(userId: string, audience: 'patient' | 'doctor' = 'patient') {
    await this.notifications.updateMany({ userId, isRead: false, ...scope(audience) }, { isRead: true });
    return { success: true, message: 'All marked as read' };
  }

  async markOneRead(userId: string, notificationId?: string, audience: 'patient' | 'doctor' = 'patient') {
    if (!isValidObjectId(notificationId)) fail('Notification not found');
    await this.notifications.updateOne({ _id: notificationId, userId, ...scope(audience) }, { isRead: true });
    return { success: true, message: 'Marked as read' };
  }

  async clear(userId: string, audience: 'patient' | 'doctor' = 'patient') {
    await this.notifications.deleteMany({ userId, ...scope(audience) });
    return { success: true, message: 'Cleared' };
  }
}

const scope = (audience: 'patient' | 'doctor') => (audience === 'doctor' ? { audience: 'doctor' as const } : PATIENT_AUDIENCE);

@Injectable()
export class EmojiService {
  constructor(
    @InjectModel(MODEL.emojiPing) private readonly pings: Model<IEmojiPing>,
    @InjectModel(MODEL.connection) private readonly connections: Model<IConnection>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    private readonly realtime: RealtimeGateway,
  ) {}

  async send(fromUserId: string, body: { toUserId?: string; emoji?: string }) {
    const { toUserId, emoji } = body;
    if (!toUserId || !emoji) fail('Missing fields');
    if (!isValidEmoji(emoji)) fail('Invalid emoji');

    // allowed in either direction of an accepted connection
    const connected = await this.connections.exists({
      status: 'accepted',
      $or: [
        { requesterId: fromUserId, patientId: toUserId },
        { requesterId: toUserId, patientId: fromUserId },
      ],
    });
    if (!connected) fail('No active connection with this user', HttpStatus.FORBIDDEN);

    const fromName = (await this.users.findById(fromUserId).select('name'))?.name || 'Someone';
    const ping = await new this.pings({ fromUserId, toUserId, emoji, fromName, delivered: false }).save();

    const delivered = this.realtime.sendEmojiToUser(toUserId, {
      pingId: ping._id,
      emoji,
      fromName,
      fromUserId,
    });
    if (delivered) await this.pings.findByIdAndUpdate(ping._id, { delivered: true });
    return { success: true, message: 'Emoji sent', delivered };
  }

  /** Pings that arrived while the user was offline; they're marked delivered once fetched. */
  async undelivered(userId: string) {
    const pings = await this.pings.find({ toUserId: userId, delivered: false }).sort({ createdAt: -1 }).limit(20);
    await this.pings.updateMany({ toUserId: userId, delivered: false }, { delivered: true });
    return { success: true, pings };
  }
}
