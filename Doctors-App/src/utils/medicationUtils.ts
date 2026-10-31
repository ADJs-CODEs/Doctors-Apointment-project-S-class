const HOUR = 60 * 60 * 1000;

// A dose taken this long after it was due still counts as on time.
const GRACE_HOURS = 1;

/**
 * Hours between two doses. 'daily' means dosagePerDay doses spread over 24h;
 * 'interval' means one dose every dosagePerDay hours. Prescriptions saved before
 * frequencyType was stored have none, and were always meant as daily.
 */
export const hoursBetweenDoses = (med: any): number => {
  const value = med.dosagePerDay > 0 ? med.dosagePerDay : 1;
  return med.frequencyType === "interval" ? value : 24 / value;
};

/** Human wording of the schedule, e.g. "3× daily" or "every 8 hours". */
export const describeSchedule = (med: any): string =>
  med.frequencyType === "interval"
    ? `every ${med.dosagePerDay} hours`
    : `${med.dosagePerDay}× daily`;

export const getDoseStatus = (med: any) => {
  if (!med.lastTaken) return { isEarly: false, hoursLeft: "0" };
  const gap = hoursBetweenDoses(med);
  const diffHours = (Date.now() - new Date(med.lastTaken).getTime()) / HOUR;
  return {
    isEarly: diffHours < gap,
    hoursLeft: Math.max(0, gap - diffHours).toFixed(1),
  };
};

export type DoseState =
  | { kind: "finished" }
  | { kind: "not-started" }
  | { kind: "taken"; nextDueAt: Date }
  | { kind: "due"; dueAt: Date }
  | { kind: "missed"; dueAt: Date; missedDoses: number };

/**
 * Where a medicine stands right now:
 * - taken:   last dose was recent; the next one isn't due yet
 * - due:     the next dose is due (within the grace window)
 * - missed:  past the grace window; missedDoses counts the skipped slots
 */
export const getDoseState = (med: any, now = Date.now()): DoseState => {
  if (med.status === "Completed" || med.remainingQuantity <= 0) return { kind: "finished" };
  if (!med.lastTaken) return { kind: "not-started" };

  const gapMs = hoursBetweenDoses(med) * HOUR;
  const dueAt = new Date(new Date(med.lastTaken).getTime() + gapMs);
  if (now < dueAt.getTime()) return { kind: "taken", nextDueAt: dueAt };

  const overdueMs = now - dueAt.getTime();
  if (overdueMs <= GRACE_HOURS * HOUR) return { kind: "due", dueAt };

  // one missed for the dose that was due, plus one for every full gap since
  const missedDoses = Math.min(1 + Math.floor(overdueMs / gapMs), med.remainingQuantity);
  return { kind: "missed", dueAt, missedDoses };
};

export const getAdherenceStats = (med: any) => {
  const total = med.totalQuantity || 1;
  const remaining = med.remainingQuantity ?? total;
  const rate = Math.min(100, Math.round(((total - remaining) / total) * 100));
  return { rate };
};

export const slotDateFormat = (slotDate: string) => {
  const dateArray = slotDate.split("_");
  return `${dateArray[0]} ${dateArray[1]} ${dateArray[2]}`;
};

/** "21_3_2026" + "10:30 am" -> Date (local time), or null if unparseable. */
export const slotToDate = (slotDate: string, slotTime: string): Date | null => {
  const [day, month, year] = slotDate.split("_").map(Number);
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(slotTime.trim());
  if (!day || !month || !year || !match) return null;
  let hours = Number(match[1]) % 12;
  if (match[3]!.toLowerCase() === "pm") hours += 12;
  return new Date(year, month - 1, day, hours, Number(match[2]));
};
