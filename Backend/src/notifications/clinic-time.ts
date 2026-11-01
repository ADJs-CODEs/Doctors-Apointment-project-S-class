// Appointment slots are stored as wall-clock text at the clinic ("27_3_2026" + "10:30 am"),
// with no time zone. These helpers turn them into real moments in time.

export const CLINIC_TZ = process.env.APP_TIMEZONE || 'Africa/Lagos';

export type WallClock = { year: number; month: number; day: number; hour: number; minute: number };

/** "27_3_2026", "10:30 am" -> wall-clock parts, or null. */
export function slotParts(slotDate: string, slotTime: string): WallClock | null {
  const [day, month, year] = (slotDate ?? '').split('_').map(Number);
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec((slotTime ?? '').trim());
  if (!day || !month || !year || !m) return null;
  let hour = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'pm') hour += 12;
  return { year, month, day, hour, minute: Number(m[2]) };
}

/** How far ahead of UTC the zone is at that instant, in ms (Lagos: +1h). */
function zoneOffset(instant: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - instant;
}

/** The moment an appointment starts, or null if its slot can't be read. */
export function slotInstant(slotDate: string, slotTime: string, tz = CLINIC_TZ): Date | null {
  const p = slotParts(slotDate, slotTime);
  if (!p) return null;
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  // subtract the zone's offset; check again in case the offset differs at the result (DST)
  let instant = wall - zoneOffset(wall, tz);
  instant = wall - zoneOffset(instant, tz);
  return new Date(instant);
}
