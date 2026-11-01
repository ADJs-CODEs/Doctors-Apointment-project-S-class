import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MODEL } from '../database/models';
import type { IUser } from '../database/schemas/user.schema';
import { CLINIC_TZ } from '../notifications/clinic-time';

/** Kinds of notification a patient can switch on/off per channel. */
export const CATEGORIES = [
  'medication', // dose coming up
  'missedDose',
  'appointments', // booked, reminders, cancelled, missed
  'messages', // from doctors
  'payments', // receipts, refunds, withdrawals
  'careCircle', // requests and updates about people you watch
  'gifts', // Wish Well gifts you receive
  'security', // sign-in alerts
] as const;
export type Category = (typeof CATEGORIES)[number];
export type Channel = 'email' | 'push';

/** These can't be switched off by email: people need receipts and to know about sign-ins. */
export const LOCKED_EMAIL: Category[] = ['payments'];

export type Settings = {
  notifications: Record<Category, { email: boolean; push: boolean }>;
  quietHours: { enabled: boolean; start: string; end: string };
  reminders: { doseMinutesBefore: 15 | 30 | 60; appointmentDayBefore: boolean };
  privacy: { giftAnonymously: boolean };
  maps: {
    enabled: boolean;
    homeAddress: string;
    travelMode: 'driving' | 'walking' | 'transit' | 'bicycling';
    /** measure distances from where they are right now, or from their home address */
    origin: 'current' | 'home';
  };
  calendar: { autoAdd: boolean };
};

export const DEFAULT_SETTINGS: Settings = {
  notifications: Object.fromEntries(CATEGORIES.map((c) => [c, { email: true, push: true }])) as Settings['notifications'],
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  reminders: { doseMinutesBefore: 30, appointmentDayBefore: false },
  privacy: { giftAnonymously: false },
  maps: { enabled: true, homeAddress: '', travelMode: 'driving', origin: 'current' },
  calendar: { autoAdd: true },
};

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const pick = <T extends string | number>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const time = (v: unknown, fallback: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback);

/** Fills in defaults and drops anything invalid, so stored settings are always complete. */
export function normalizeSettings(raw: any): Settings {
  const d = DEFAULT_SETTINGS;
  const r = raw && typeof raw === 'object' ? raw : {};
  const notifications = {} as Settings['notifications'];
  for (const c of CATEGORIES) {
    const n = r.notifications?.[c] ?? {};
    notifications[c] = {
      email: LOCKED_EMAIL.includes(c) ? true : bool(n.email, d.notifications[c].email),
      push: bool(n.push, d.notifications[c].push),
    };
  }
  return {
    notifications,
    quietHours: {
      enabled: bool(r.quietHours?.enabled, d.quietHours.enabled),
      start: time(r.quietHours?.start, d.quietHours.start),
      end: time(r.quietHours?.end, d.quietHours.end),
    },
    reminders: {
      doseMinutesBefore: pick(r.reminders?.doseMinutesBefore, [15, 30, 60] as const, d.reminders.doseMinutesBefore),
      appointmentDayBefore: bool(r.reminders?.appointmentDayBefore, d.reminders.appointmentDayBefore),
    },
    privacy: { giftAnonymously: bool(r.privacy?.giftAnonymously, d.privacy.giftAnonymously) },
    maps: {
      enabled: bool(r.maps?.enabled, d.maps.enabled),
      homeAddress: typeof r.maps?.homeAddress === 'string' ? r.maps.homeAddress.trim().slice(0, 200) : d.maps.homeAddress,
      travelMode: pick(r.maps?.travelMode, ['driving', 'walking', 'transit', 'bicycling'] as const, d.maps.travelMode),
      origin: pick(r.maps?.origin, ['current', 'home'] as const, d.maps.origin),
    },
    calendar: { autoAdd: bool(r.calendar?.autoAdd, d.calendar.autoAdd) },
  };
}

/** "22:00".."07:00" in the clinic's time zone, wrapping past midnight. */
function inQuietHours(q: Settings['quietHours'], now = new Date()) {
  if (!q.enabled) return false;
  const hm = now.toLocaleTimeString('en-GB', { timeZone: CLINIC_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return q.start <= q.end ? hm >= q.start && hm < q.end : hm >= q.start || hm < q.end;
}

/**
 * Reads a user's notification settings, with a short cache because every notification
 * asks. Users without settings get the defaults (everything on).
 */
@Injectable()
export class Preferences {
  private readonly cache = new Map<string, { at: number; settings: Settings }>();

  constructor(@InjectModel(MODEL.user) private readonly users: Model<IUser>) {}

  async get(userId: string): Promise<Settings> {
    const hit = this.cache.get(userId);
    if (hit && Date.now() - hit.at < 30_000) return hit.settings;
    const user = await this.users.findById(userId).select('settings').lean().catch(() => null);
    const settings = normalizeSettings(user?.settings);
    this.cache.set(userId, { at: Date.now(), settings });
    if (this.cache.size > 5000) this.cache.clear();
    return settings;
  }

  forget(userId: string) {
    this.cache.delete(userId);
  }

  /** Should this user get this kind of notification on this channel right now? */
  async allows(userId: string | undefined, category: Category | undefined, channel: Channel, urgent = false) {
    if (!userId || !category) return true; // not a patient notification (e.g. to a doctor or the admin)
    const s = await this.get(userId);
    if (!s.notifications[category][channel]) return false;
    // quiet hours mute the device, never email, and never urgent alerts
    if (channel === 'push' && !urgent && inQuietHours(s.quietHours)) return false;
    return true;
  }
}
