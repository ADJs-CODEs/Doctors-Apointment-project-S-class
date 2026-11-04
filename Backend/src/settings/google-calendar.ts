import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import type { Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IDoctor } from '../database/schemas/doctor.schema';
import type { IUser } from '../database/schemas/user.schema';
import { CLINIC_TZ, slotParts } from '../notifications/clinic-time';
import { Preferences } from './preferences';
import { open, seal } from './secret-box';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const VISIT_MINUTES = 30;

/** Whose calendar: the patient's (event id in calendarEventId) or the doctor's (doctorCalendarEventId). */
type Side = 'patient' | 'doctor';
type Connected = { googleCalendar?: { email?: string; connectedAt?: Date; lastError?: string } };

/** "14_11_2026" + "10:30 am" -> "2026-11-14T10:30:00" (clinic wall-clock), plus the end. */
function eventTimes(a: IAppointment) {
  const p = slotParts(a.slotDate, a.slotTime);
  if (!p) return null;
  const fmt = (d: Date) => d.toISOString().slice(0, 19); // UTC used only as a calculator
  const start = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute));
  return { start: fmt(start), end: fmt(new Date(start.getTime() + VISIT_MINUTES * 60_000)) };
}

/**
 * Google Calendar for patients and doctors: they connect once (OAuth "authorization code"
 * flow from the browser, exchanged here with the client secret), and their appointments are
 * then added to their primary calendar, and removed when cancelled or missed. Refresh tokens
 * are stored encrypted. Everything here is best-effort: a calendar hiccup never fails a booking.
 */
@Injectable()
export class GoogleCalendar {
  private readonly logger = new Logger('GoogleCalendar');

  constructor(
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly prefs: Preferences,
  ) {}

  /** Both halves of the OAuth client are needed; the secret is server-only. */
  configured() {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  // both kinds of account keep the connection in the same shape
  private owners(side: Side): Model<any> {
    return side === 'patient' ? this.users : this.doctors;
  }

  private eventField(side: Side) {
    return side === 'patient' ? 'calendarEventId' : 'doctorCalendarEventId';
  }

  // --- connecting ---

  connect(userId: string, code?: string) {
    return this.connectFor('patient', userId, code);
  }

  connectDoctor(docId: string, code?: string) {
    return this.connectFor('doctor', docId, code);
  }

  disconnect(userId: string) {
    return this.disconnectFor('patient', userId);
  }

  disconnectDoctor(docId: string) {
    return this.disconnectFor('doctor', docId);
  }

  private async connectFor(side: Side, id: string, code?: string) {
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

    const existing = await this.owners(side).findById(id).select('+googleCalendar.refreshToken googleCalendar');
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

    await this.owners(side).updateOne(
      { _id: id },
      { $set: { googleCalendar: { email, refreshToken: seal(refreshToken), connectedAt: new Date() } } },
    );
    return { success: true, message: 'Google Calendar connected', email };
  }

  private async disconnectFor(side: Side, id: string) {
    const owner = await this.owners(side).findById(id).select('+googleCalendar.refreshToken googleCalendar');
    const sealed = owner?.googleCalendar?.refreshToken;
    if (sealed) {
      // tell Google to drop our access too
      await axios
        .post('https://oauth2.googleapis.com/revoke', new URLSearchParams({ token: open(sealed) }))
        .catch(() => {});
    }
    await this.owners(side).updateOne({ _id: id }, { $unset: { googleCalendar: 1 } });
    return { success: true, message: 'Google Calendar disconnected' };
  }

  status(owner: Connected) {
    return {
      configured: this.configured(),
      connected: !!owner.googleCalendar?.connectedAt,
      email: owner.googleCalendar?.email,
      connectedAt: owner.googleCalendar?.connectedAt,
      lastError: owner.googleCalendar?.lastError,
    };
  }

  // --- talking to Google ---

  /** A fresh access token for this patient/doctor, or null if they aren't connected. */
  private async accessToken(side: Side, id: string): Promise<string | null> {
    if (!this.configured()) return null;
    const owner = await this.owners(side).findById(id).select('+googleCalendar.refreshToken googleCalendar').lean<Connected & { googleCalendar?: { refreshToken?: string } }>();
    const sealed = owner?.googleCalendar?.refreshToken;
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
      await this.owners(side).updateOne({ _id: id }, { $set: { 'googleCalendar.lastError': `Google refused access (${reason}). Reconnect it.` } });
      return null;
    }
  }

  private eventBody(side: Side, a: IAppointment) {
    const t = eventTimes(a)!;
    const where = [a.docData?.address?.line1, a.docData?.address?.line2].filter(Boolean).join(', ');
    const video = a.kind === 'video';
    if (side === 'doctor') {
      const panel = process.env.ADMIN_URL || '';
      const patient = a.userData?.name ?? 'a patient';
      return {
        summary: `${video ? 'Video call' : 'Appointment'}: ${patient}`,
        description: video
          ? `Video consultation booked on ADJ's CODEs. Join here (opens 10 minutes before):\n${panel}/doctor-call/${a._id}`
          : `Clinic visit booked on ADJ's CODEs.\n${panel}/doctor-appointments`,
        location: video ? `${panel}/doctor-call/${a._id}` : where || undefined,
        start: { dateTime: t.start, timeZone: CLINIC_TZ },
        end: { dateTime: t.end, timeZone: CLINIC_TZ },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] },
        extendedProperties: { private: { appointmentId: String(a._id) } },
      };
    }
    const site = process.env.USER_URL || process.env.CLIENT_URL || '';
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

  /** Adds (or refreshes) an appointment in the patient's and the doctor's calendars. Never throws. */
  async upsert(appointmentOrId: IAppointment | string) {
    const a = typeof appointmentOrId === 'string' ? await this.appointments.findById(appointmentOrId).catch(() => null) : appointmentOrId;
    if (!a || a.cancelled || a.missed || !eventTimes(a)) return false;
    const [patient] = await Promise.all([
      this.upsertFor('patient', a),
      this.upsertFor('doctor', a),
    ]);
    return patient;
  }

  private async upsertFor(side: Side, a: IAppointment) {
    try {
      const id = side === 'patient' ? a.userId : a.docId;
      if (side === 'patient' && !(await this.prefs.get(a.userId)).calendar.autoAdd) return false;
      const token = await this.accessToken(side, id);
      if (!token) return false;

      const headers = { Authorization: `Bearer ${token}` };
      const field = this.eventField(side);
      const existing = (a as any)[field] as string | undefined;
      if (existing) {
        await axios.patch(`${EVENTS_URL}/${encodeURIComponent(existing)}`, this.eventBody(side, a), { headers });
      } else {
        const { data } = await axios.post(EVENTS_URL, this.eventBody(side, a), { headers });
        await this.appointments.updateOne({ _id: a._id }, { $set: { [field]: data.id } });
      }
      await this.owners(side).updateOne({ _id: id }, { $unset: { 'googleCalendar.lastError': 1 } });
      return true;
    } catch (err: any) {
      this.logger.warn(`${side} calendar add failed: ${err.response?.data?.error?.message ?? err.message}`);
      return false;
    }
  }

  /** Takes a cancelled/missed appointment off both calendars. Never throws. */
  async remove(appointment: IAppointment) {
    await Promise.all([this.removeFor('patient', appointment), this.removeFor('doctor', appointment)]);
  }

  private async removeFor(side: Side, appointment: IAppointment) {
    try {
      const field = this.eventField(side);
      const eventId = (appointment as any)[field] as string | undefined;
      if (!eventId) return;
      const token = await this.accessToken(side, side === 'patient' ? appointment.userId : appointment.docId);
      if (!token) return;
      await axios
        .delete(`${EVENTS_URL}/${encodeURIComponent(eventId)}`, { headers: { Authorization: `Bearer ${token}` } })
        .catch((err) => {
          if (err.response?.status !== 404 && err.response?.status !== 410) throw err; // already gone is fine
        });
      await this.appointments.updateOne({ _id: appointment._id }, { $unset: { [field]: 1 } });
    } catch (err: any) {
      this.logger.warn(`${side} calendar remove failed: ${err.response?.data?.error?.message ?? err.message}`);
    }
  }

  /** Adds every upcoming appointment (used right after connecting, and "Sync now"). */
  syncUpcoming(userId: string) {
    return this.syncFor('patient', userId);
  }

  syncDoctorUpcoming(docId: string) {
    return this.syncFor('doctor', docId);
  }

  private async syncFor(side: Side, id: string) {
    const field = this.eventField(side);
    const pending = await this.appointments.find({
      [side === 'patient' ? 'userId' : 'docId']: id,
      cancelled: false,
      isCompleted: false,
      missed: { $exists: false },
      holdExpiresAt: { $exists: false }, // not a booking until it's paid
      [field]: { $exists: false },
      date: { $gt: Date.now() - 120 * 24 * 60 * 60 * 1000 },
    });
    const now = Date.now();
    let added = 0;
    for (const a of pending) {
      const p = slotParts(a.slotDate, a.slotTime);
      // future visits only (a day of slack for time zones)
      if (!p || Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) < now - 24 * 60 * 60 * 1000) continue;
      if (await this.upsertFor(side, a)) added++;
    }
    return { success: true, message: added ? `Added ${added} upcoming appointment${added === 1 ? '' : 's'} to your calendar` : 'Your calendar is up to date', added };
  }
}
