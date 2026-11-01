import type { Availability, IDoctor, VisitKind } from '../database/schemas/doctor.schema';
import { CLINIC_TZ, slotInstant, slotParts } from '../notifications/clinic-time';

// Which times a doctor can be booked for. Everything is in the clinic's local time
// (APP_TIMEZONE), and slots are stored the way appointments always have been:
// date "14_11_2026" + time "10:30 am".

const DAYS_AHEAD = 14;
/** a slot must start at least this far in the future to be offered */
const LEAD_MINUTES = 30;

/** What doctors had before they set hours: every day 10am–9pm, every 30 min, clinic visits. */
export const DEFAULT_AVAILABILITY: Availability = {
  slotMinutes: 30,
  weekly: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: '10:00', end: '21:00', kinds: ['in-person'] as VisitKind[] })),
  daysOff: [],
};

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMinutes = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

/** Cleans what a doctor saved: valid times, start before end, known kinds, real dates. */
export function normalizeAvailability(raw: any): Availability {
  const r = raw && typeof raw === 'object' ? raw : {};
  const slotMinutes = [15, 30, 45, 60].includes(r.slotMinutes) ? r.slotMinutes : 30;
  const weekly = (Array.isArray(r.weekly) ? r.weekly : [])
    .filter(
      (w: any) =>
        Number.isInteger(w?.day) &&
        w.day >= 0 &&
        w.day <= 6 &&
        HM.test(w.start) &&
        HM.test(w.end) &&
        toMinutes(w.end) - toMinutes(w.start) >= slotMinutes,
    )
    .map((w: any) => ({
      day: w.day,
      start: w.start,
      end: w.end,
      kinds: (['in-person', 'video'] as VisitKind[]).filter((k) => Array.isArray(w.kinds) && w.kinds.includes(k)),
    }))
    .filter((w: any) => w.kinds.length)
    .slice(0, 50);
  const daysOff = (Array.isArray(r.daysOff) ? r.daysOff : [])
    .filter((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .slice(0, 200);
  return { slotMinutes, weekly, daysOff };
}

export const availabilityOf = (doctor: Pick<IDoctor, 'availability'>) =>
  doctor.availability ? normalizeAvailability(doctor.availability) : DEFAULT_AVAILABILITY;

/** Does this doctor see patients this way? (video needs a video fee) */
export const offers = (doctor: Pick<IDoctor, 'availability' | 'videoFees'>, kind: VisitKind) =>
  (kind !== 'video' || (doctor.videoFees ?? 0) > 0) && availabilityOf(doctor).weekly.some((w) => w.kinds.includes(kind));

export const feeFor = (doctor: Pick<IDoctor, 'fees' | 'videoFees'>, kind: VisitKind) =>
  kind === 'video' ? doctor.videoFees ?? doctor.fees : doctor.fees;

/** minutes after midnight -> "10:30 am" (the format appointments have always used) */
export const slotLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(((h + 11) % 12) + 1).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

/** "10:30 AM" / "10:30 am" / "9:00 pm" -> minutes after midnight (old bookings used several formats) */
export const labelMinutes = (label: string) => {
  const p = slotParts('1_1_2000', label);
  return p ? p.hour * 60 + p.minute : null;
};

/** The clinic's calendar date (and weekday) n days from now. */
function clinicDay(offsetDays: number, now: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: CLINIC_TZ, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date(now))
      .map((p) => [p.type, p.value]),
  );
  // step through dates with UTC as a plain calendar (no zone maths needed for date-only)
  const d = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + offsetDays));
  return {
    slotDate: `${d.getUTCDate()}_${d.getUTCMonth() + 1}_${d.getUTCFullYear()}`,
    iso: d.toISOString().slice(0, 10),
    weekday: d.getUTCDay(),
  };
}

export type DaySlots = { slotDate: string; iso: string; weekday: number; slots: string[] };

/**
 * Free times for the next two weeks: the doctor's hours for this kind of visit, minus
 * days off, booked/held slots and anything starting too soon.
 */
export function freeSlots(doctor: Pick<IDoctor, 'availability' | 'videoFees' | 'slots_booked'>, kind: VisitKind, now = Date.now()): DaySlots[] {
  if (!offers(doctor, kind)) return [];
  const a = availabilityOf(doctor);
  const days: DaySlots[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = clinicDay(i, now);
    if (a.daysOff.includes(day.iso)) continue;
    const taken = new Set(
      (doctor.slots_booked?.[day.slotDate] ?? []).map(labelMinutes).filter((m): m is number => m !== null),
    );
    const minutes = new Set<number>();
    for (const w of a.weekly) {
      if (w.day !== day.weekday || !w.kinds.includes(kind)) continue;
      for (let m = toMinutes(w.start); m + a.slotMinutes <= toMinutes(w.end); m += a.slotMinutes) minutes.add(m);
    }
    const slots = [...minutes]
      .sort((x, y) => x - y)
      .filter((m) => !taken.has(m))
      .map(slotLabel)
      .filter((label) => (slotInstant(day.slotDate, label)?.getTime() ?? 0) > now + LEAD_MINUTES * 60_000);
    if (slots.length) days.push({ ...day, slots });
  }
  return days;
}

/** Is this exact slot one the doctor offers and is still free? */
export function isBookable(
  doctor: Pick<IDoctor, 'availability' | 'videoFees' | 'slots_booked'>,
  kind: VisitKind,
  slotDate: string,
  slotTime: string,
  now = Date.now(),
) {
  const wanted = labelMinutes(slotTime);
  if (wanted === null) return false;
  const day = freeSlots(doctor, kind, now).find((d) => d.slotDate === slotDate);
  return !!day?.slots.some((s) => labelMinutes(s) === wanted);
}
