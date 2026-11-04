import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MODEL } from '../database/models';
import type { DoctorEmail, DoctorSettings, IDoctor } from '../database/schemas/doctor.schema';
import { inQuietHours } from './preferences';

/** The emails a doctor can switch off. Safety alerts (early dose, visit to close) aren't here: always sent. */
export const DOCTOR_EMAILS: DoctorEmail[] = ['bookings', 'cancellations', 'visitStarting'];

export const DEFAULT_DOCTOR_SETTINGS: DoctorSettings = {
  emails: { bookings: true, cancellations: true, visitStarting: true },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
};

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const time = (v: unknown, fallback: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback);

/** Fills defaults and drops anything unknown, so what's stored is always valid. */
export function normalizeDoctorSettings(raw: any): DoctorSettings {
  const d = DEFAULT_DOCTOR_SETTINGS;
  const r = raw && typeof raw === 'object' ? raw : {};
  const emails = {} as DoctorSettings['emails'];
  for (const e of DOCTOR_EMAILS) emails[e] = bool(r.emails?.[e], d.emails[e]);
  return {
    emails,
    quietHours: {
      enabled: bool(r.quietHours?.enabled, d.quietHours.enabled),
      start: time(r.quietHours?.start, d.quietHours.start),
      end: time(r.quietHours?.end, d.quietHours.end),
    },
  };
}

/**
 * A doctor's email choices, with a short cache (every doctor email asks). Quiet hours hold
 * back non-urgent emails; the bell still shows everything, and safety emails always go.
 */
@Injectable()
export class DoctorPreferences {
  private readonly cache = new Map<string, { at: number; settings: DoctorSettings }>();

  constructor(@InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>) {}

  async get(docId: string): Promise<DoctorSettings> {
    const hit = this.cache.get(docId);
    if (hit && Date.now() - hit.at < 30_000) return hit.settings;
    const doctor = await this.doctors.findById(docId).select('settings').lean().catch(() => null);
    const settings = normalizeDoctorSettings(doctor?.settings);
    this.cache.set(docId, { at: Date.now(), settings });
    if (this.cache.size > 2000) this.cache.clear();
    return settings;
  }

  forget(docId: string) {
    this.cache.delete(docId);
  }

  /** Should this doctor be emailed about this, right now? */
  async allowsEmail(docId: string, kind: DoctorEmail) {
    const s = await this.get(docId);
    return s.emails[kind] && !inQuietHours(s.quietHours);
  }
}
