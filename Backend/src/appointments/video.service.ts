import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import * as crypto from 'crypto';
import { isValidObjectId, type Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import { slotInstant } from '../notifications/clinic-time';

const MINUTE = 60_000;
/** the room opens this long before the slot... */
export const JOIN_EARLY = 10 * MINUTE;
/** ...and stays open this long after it starts */
export const JOIN_LATE = 60 * MINUTE;
const DAILY_API = 'https://api.daily.co/v1';

/**
 * Video consultations. A video appointment gets a private room the first time someone
 * joins, open from 10 min before the slot to an hour after it.
 *  - With DAILY_API_KEY: a private Daily.co room plus a personal meeting token for each
 *    side (the doctor is the room owner), shown inside the app.
 *  - Without it: a Jitsi Meet room whose name can't be guessed, opened in a new tab.
 */
@Injectable()
export class VideoService {
  private readonly logger = new Logger('Video');

  constructor(@InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>) {}

  private get dailyKey() {
    return process.env.DAILY_API_KEY;
  }

  /** Can this person join right now? Throws a readable reason if not. */
  private async joinable(appointmentId: string, who: { userId?: string; docId?: string }) {
    if (!isValidObjectId(appointmentId)) fail('Appointment not found', HttpStatus.NOT_FOUND);
    const a = await this.appointments.findById(appointmentId);
    if (!a) fail('Appointment not found', HttpStatus.NOT_FOUND);
    if ((who.userId && a.userId !== who.userId) || (who.docId && a.docId !== who.docId)) {
      fail('This is not your appointment', HttpStatus.FORBIDDEN);
    }
    if (a.kind !== 'video') fail('This is an in-person appointment');
    if (a.cancelled) fail('This appointment was cancelled');
    if (a.missed) fail('This appointment was recorded as missed');
    // bookings are paid up front; older unpaid ones must be paid before the call
    if (!a.payment) fail('Pay for this video call before joining');

    const start = slotInstant(a.slotDate, a.slotTime);
    if (!start) fail("This appointment's time can't be read");
    const now = Date.now();
    if (now < start.getTime() - JOIN_EARLY) {
      const mins = Math.ceil((start.getTime() - JOIN_EARLY - now) / MINUTE);
      fail(mins > 120 ? 'The call opens 10 minutes before the appointment' : `The call opens in ${mins} minute${mins === 1 ? '' : 's'}`);
    }
    if (now > start.getTime() + JOIN_LATE) fail('This call has ended');
    return { a, start };
  }

  async join(appointmentId: string, who: { userId?: string; docId?: string }) {
    const { a, start } = await this.joinable(appointmentId, who);
    const isDoctor = !!who.docId;
    const name = isDoctor ? a.docData?.name ?? 'Doctor' : a.userData?.name ?? 'Patient';
    const closesAt = Math.floor((start.getTime() + JOIN_LATE) / 1000);

    if (this.dailyKey) {
      try {
        const room = a.video?.provider === 'daily' ? a.video : await this.createDailyRoom(a, start);
        const { data } = await axios.post(
          `${DAILY_API}/meeting-tokens`,
          { properties: { room_name: room.room, user_name: name, is_owner: isDoctor, exp: closesAt } },
          { headers: { Authorization: `Bearer ${this.dailyKey}` }, timeout: 10_000 },
        );
        return { success: true, provider: 'daily', url: `${room.url}?t=${data.token}`, embed: true, closesAt };
      } catch (err: any) {
        this.logger.error(`Daily room/token failed: ${err.response?.data?.info ?? err.message}`);
        // fall through to Jitsi so the call can still happen
      }
    }

    const room = a.video?.provider === 'jitsi' ? a.video : await this.saveRoom(a, this.jitsiRoom(a));
    return { success: true, provider: 'jitsi', url: room.url, embed: false, closesAt };
  }

  /** A private Daily room that only exists around the appointment's time. */
  private async createDailyRoom(a: IAppointment, start: Date) {
    const name = `appt-${a._id}-${crypto.randomBytes(4).toString('hex')}`;
    const { data } = await axios.post(
      `${DAILY_API}/rooms`,
      {
        name,
        privacy: 'private', // only people with a meeting token get in
        properties: {
          nbf: Math.floor((start.getTime() - JOIN_EARLY) / 1000),
          exp: Math.floor((start.getTime() + JOIN_LATE) / 1000),
          eject_at_room_exp: true,
          enable_prejoin_ui: true,
          enable_chat: true,
          enable_screenshare: true,
          max_participants: 4,
        },
      },
      { headers: { Authorization: `Bearer ${this.dailyKey}` }, timeout: 10_000 },
    );
    return this.saveRoom(a, { provider: 'daily', room: data.name, url: data.url });
  }

  /** Jitsi rooms are public by name, so the name is a keyed hash nobody can guess. */
  private jitsiRoom(a: IAppointment) {
    const secret = process.env.JWT_SECRET ?? 'video';
    const tag = crypto.createHmac('sha256', secret).update(`video:${a._id}`).digest('hex').slice(0, 20);
    const room = `ADJsCODEs-consult-${tag}`;
    return { provider: 'jitsi' as const, room, url: `https://meet.jit.si/${room}` };
  }

  private async saveRoom(a: IAppointment, video: { provider: 'daily' | 'jitsi'; room: string; url: string }) {
    // keep the first room if two people joined at the same moment
    const saved = await this.appointments.findOneAndUpdate(
      { _id: a._id, $or: [{ video: { $exists: false } }, { 'video.provider': { $ne: video.provider } }] },
      { $set: { video } },
      { returnDocument: 'after' },
    );
    return saved?.video ?? (await this.appointments.findById(a._id).lean())!.video!;
  }
}
