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

const EMOJI_KEYS: Record<string, keyof IWishWell['emojiCounts']> = {
  '❤️': 'heart',
  '🌸': 'flower',
  '👏': 'clap',
  '⭐': 'star',
  '🙏': 'prayer',
};
const isValidEmoji = (emoji: unknown): emoji is string =>
  typeof emoji === 'string' && emoji in EMOJI_KEYS;

// Wish Well: doctors list critically ill patients (who have consented) so the community
// can send encouragement emojis; when the patient recovers, the emojis stop.
@Injectable()
export class WishWellService {
  constructor(
    @InjectModel(MODEL.wishWell) private readonly entries: Model<IWishWell>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly realtime: RealtimeGateway,
  ) {}

  async publicEntries() {
    const entries = await this.entries
      .find({ consentGiven: true, optedOut: false })
      .sort({ status: 1, createdAt: -1 });
    return { success: true, entries };
  }

  async nominate(docId: string, body: { patientId?: string; condition?: string; story?: string }) {
    const { patientId, condition, story } = body;
    if (!patientId || !condition || !story) fail('Missing fields');

    const patient = await this.users.findById(patientId).select('name image');
    if (!patient) fail('Patient not found', HttpStatus.NOT_FOUND);

    // a doctor may only nominate their own patients
    const appointment = await this.appointments.findOne({ docId, userId: patientId });
    if (!appointment) fail('You can only nominate your own patients', HttpStatus.FORBIDDEN);

    if (await this.entries.exists({ patientId, status: 'critical' })) {
      fail('Patient already on the Wish Well');
    }

    const entry = await new this.entries({
      patientId,
      patientName: patient.name,
      patientImage: patient.image,
      doctorId: docId,
      doctorName: appointment.docData?.name || 'Doctor',
      condition,
      story,
      consentGiven: true, // the nominating doctor approves directly
    }).save();
    return { success: true, message: 'Patient added to Wish Well', entry };
  }

  async giveConsent(userId: string, body: { entryId?: string; accept?: boolean }) {
    const entry = await this.entries.findById(body.entryId);
    if (!entry) fail('Entry not found', HttpStatus.NOT_FOUND);
    if (entry.patientId !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);

    if (!body.accept) {
      await this.entries.findByIdAndDelete(body.entryId);
      return { success: true, message: 'Declined' };
    }
    entry.consentGiven = true;
    await entry.save();
    return { success: true, message: 'Added to Wish Well' };
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

    const entry = await this.entries.findById(entryId);
    if (!entry || !entry.consentGiven || entry.optedOut) fail('Entry not found', HttpStatus.NOT_FOUND);
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

  async updateStatus(docId: string, body: { entryId?: string; status?: string }) {
    const { entryId, status } = body;
    if (status !== 'recovered' && status !== 'passed') fail('Invalid status');

    const entry = await this.entries.findById(entryId);
    if (!entry) fail('Entry not found', HttpStatus.NOT_FOUND);
    if (entry.doctorId !== docId) fail('Unauthorized', HttpStatus.FORBIDDEN);

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

  async remove(docId: string, entryId?: string) {
    const entry = await this.entries.findById(entryId);
    if (!entry) fail('Entry not found', HttpStatus.NOT_FOUND);
    if (entry.doctorId !== docId) fail('Unauthorized', HttpStatus.FORBIDDEN);

    await this.entries.findByIdAndDelete(entryId);
    return { success: true, message: 'Removed from Wish Well' };
  }
}

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
