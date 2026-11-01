import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import type { Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IUser } from '../database/schemas/user.schema';
import { CLINIC_TZ, slotParts } from '../notifications/clinic-time';
import { Preferences } from './preferences';
import { open, seal } from './secret-box';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const VISIT_MINUTES = 30;

/** "14_11_2026" + "10:30 am" -> "2026-11-14T10:30:00" (clinic wall-clock), plus the end. */
function eventTimes(a: IAppointment) {
  const p = slotParts(a.slotDate, a.slotTime);
  if (!p) return null;
  const fmt = (d: Date) => d.toISOString().slice(0, 19); // UTC used only as a calculator
  const start = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute));
  return { start: fmt(start), end: fmt(new Date(start.getTime() + VISIT_MINUTES * 60_000)) };
}

/**
 * Google Calendar for patients: they connect once (OAuth "authorization code" flow from
 * the browser, exchanged here with the client secret), and their appointments are then
 * added to their primary calendar, and removed when cancelled or missed. The refresh
 * token is stored encrypted. Everything here is best-effort: a calendar hiccup never
 * fails a booking.
 */
@Injectable()
export class GoogleCalendar {
  private readonly logger = new Logger('GoogleCalendar');

  constructor(
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly prefs: Preferences,
  ) {}

  /** Both halves of the OAuth client are needed; the secret is server-only. */
  configured() {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  // --- connecting ---

  async connect(userId: string, code?: string) {
    if (!this.configured()) fail('Google Calendar isn\'t set up on the server yet', HttpStatus.SERVICE_UNAVAILABLE);
    if (!code || typeof code !== 'string') fail('Missing Google authorization code');

    let tokens: { access_token: string; refresh_token?: string; scope?: string; id_token?: string };
    try {
      const { data } = await axios.post(
        TOKEN_URL,
        new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID as string,
          client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
          // the popup ("auth-code") flow from @react-oauth/google uses this special value
          redirect_uri: 'postmessage',
          grant_type: 'authorization_code',
        }),
      );
      tokens = data;
    } catch (err: any) {
      this.logger.warn(`code exchange failed: ${err.response?.data?.error_description ?? err.message}`);
      fail('Google didn\'t accept the connection. Please try again.');
    }
    if (!tokens.scope?.includes(CALENDAR_SCOPE)) fail('Please allow access to your calendar to connect it');

    const existing = await this.users.findById(userId).select('+googleCalendar.refreshToken googleCalendar');
    const refreshToken = tokens.refresh_token ?? (existing?.googleCalendar?.refreshToken ? open(existing.googleCalendar.refreshToken) : undefined);
    if (!refreshToken) {
      // Google only sends it the first time someone consents; if they connected before and
      // removed it here, Google needs to forget the old consent first
      fail('Google didn\'t send a lasting permission. Remove this app at myaccount.google.com/permissions, then connect again.');
    }

    let email: string | undefined;
    try {
      const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      email = data.email;
    } catch {
      // the email is only for display
    }

    await this.users.updateOne(
      { _id: userId },
      { $set: { googleCalendar: { email, refreshToken: seal(refreshToken), connectedAt: new Date() } } },
    );
    return { success: true, message: 'Google Calendar connected', email };
  }

  async disconnect(userId: string) {
    const user = await this.users.findById(userId).select('+googleCalendar.refreshToken googleCalendar');
    const sealed = user?.googleCalendar?.refreshToken;
    if (sealed) {
      // tell Google to drop our access too
      await axios
        .post('https://oauth2.googleapis.com/revoke', new URLSearchParams({ token: open(sealed) }))
        .catch(() => {});
    }
    await this.users.updateOne({ _id: userId }, { $unset: { googleCalendar: 1 } });
    return { success: true, message: 'Google Calendar disconnected' };
  }

  status(user: Pick<IUser, 'googleCalendar'>) {
    return {
      configured: this.configured(),
      connected: !!user.googleCalendar?.connectedAt,
      email: user.googleCalendar?.email,
      connectedAt: user.googleCalendar?.connectedAt,
      lastError: user.googleCalendar?.lastError,
    };
  }

  // --- talking to Google ---

  /** A fresh access token for this user, or null if they aren't connected. */
  private async accessToken(userId: string): Promise<string | null> {
    if (!this.configured()) return null;
    const user = await this.users.findById(userId).select('+googleCalendar.refreshToken googleCalendar').lean();
    const sealed = user?.googleCalendar?.refreshToken;
    if (!sealed) return null;
    try {
      const { data } = await axios.post(
        TOKEN_URL,
        new URLSearchParams({
          refresh_token: open(sealed),
          client_id: process.env.GOOGLE_CLIENT_ID as string,
          client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
          grant_type: 'refresh_token',
        }),
      );
      return data.access_token;
    } catch (err: any) {
      const reason = err.response?.data?.error ?? err.message;
      // invalid_grant: they revoked access from their Google account
      await this.users.updateOne({ _id: userId }, { $set: { 'googleCalendar.lastError': `Google refused access (${reason}). Reconnect it.` } });
      return null;
    }
  }

  private eventBody(a: IAppointment) {
    const t = eventTimes(a)!;
    const where = [a.docData?.address?.line1, a.docData?.address?.line2].filter(Boolean).join(', ');
    const site = process.env.USER_URL || process.env.CLIENT_URL || '';
    const video = a.kind === 'video';
    return {
      summary: `${video ? 'Video call' : 'Appointment'} with ${a.docData?.name ?? 'your doctor'}`,
      description: video
        ? `Video consultation booked on ADJ's CODEs. Join here (opens 10 minutes before):\n${site}/call/${a._id}`
        : `${a.docData?.speciality ?? ''} appointment booked on ADJ's CODEs.\n${site}/my-appointments`,
      location: video ? `${site}/call/${a._id}` : where || undefined,
      start: { dateTime: t.start, timeZone: CLINIC_TZ },
      end: { dateTime: t.end, timeZone: CLINIC_TZ },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
      extendedProperties: { private: { appointmentId: String(a._id) } },
    };
  }

  /** Adds (or refreshes) an appointment in the patient's calendar. Never throws. */
  async upsert(appointmentOrId: IAppointment | string) {
    try {
      const a =
        typeof appointmentOrId === 'string' ? await this.appointments.findById(appointmentOrId) : appointmentOrId;
      if (!a || a.cancelled || a.missed || !eventTimes(a)) return false;
      if (!(await this.prefs.get(a.userId)).calendar.autoAdd) return false;
      const token = await this.accessToken(a.userId);
      if (!token) return false;

      const headers = { Authorization: `Bearer ${token}` };
      if (a.calendarEventId) {
        await axios.patch(`${EVENTS_URL}/${encodeURIComponent(a.calendarEventId)}`, this.eventBody(a), { headers });
      } else {
        const { data } = await axios.post(EVENTS_URL, this.eventBody(a), { headers });
        await this.appointments.updateOne({ _id: a._id }, { $set: { calendarEventId: data.id } });
      }
      await this.users.updateOne({ _id: a.userId }, { $unset: { 'googleCalendar.lastError': 1 } });
      return true;
    } catch (err: any) {
      this.logger.warn(`calendar add failed: ${err.response?.data?.error?.message ?? err.message}`);
      return false;
    }
  }

  /** Takes a cancelled/missed appointment off the patient's calendar. Never throws. */
  async remove(appointment: IAppointment) {
    try {
      if (!appointment.calendarEventId) return;
      const token = await this.accessToken(appointment.userId);
      if (!token) return;
      await axios
        .delete(`${EVENTS_URL}/${encodeURIComponent(appointment.calendarEventId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch((err) => {
          if (err.response?.status !== 404 && err.response?.status !== 410) throw err; // already gone is fine
        });
      await this.appointments.updateOne({ _id: appointment._id }, { $unset: { calendarEventId: 1 } });
    } catch (err: any) {
      this.logger.warn(`calendar remove failed: ${err.response?.data?.error?.message ?? err.message}`);
    }
  }

  /** Adds every upcoming appointment (used right after connecting). */
  async syncUpcoming(userId: string) {
    const pending = await this.appointments.find({
      userId,
      cancelled: false,
      isCompleted: false,
      missed: { $exists: false },
      calendarEventId: { $exists: false },
      date: { $gt: Date.now() - 120 * 24 * 60 * 60 * 1000 },
    });
    const now = Date.now();
    let added = 0;
    for (const a of pending) {
      const p = slotParts(a.slotDate, a.slotTime);
      // future visits only (a day of slack for time zones)
      if (!p || Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) < now - 24 * 60 * 60 * 1000) continue;
      if (await this.upsert(a)) added++;
    }
    return { success: true, message: added ? `Added ${added} upcoming appointment${added === 1 ? '' : 's'} to your calendar` : 'Your calendar is up to date', added };
  }
}
