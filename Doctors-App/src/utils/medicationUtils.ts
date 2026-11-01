const HOUR = 60 * 60 * 1000;

// A dose taken this long after it was due still counts as on time.
const GRACE_HOURS = 1;
// The next dose is flagged this long before it's due.
const DUE_SOON_MINUTES = 30;

/** How loudly a medicine needs attention: orange (take it now) or red (missed). */
export type DoseUrgency = "due" | "missed" | null;
export const doseUrgency = (state: DoseState): DoseUrgency =>
  state.kind === "missed" ? "missed" : state.kind === "due" || state.kind === "due-soon" ? "due" : null;

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
  if (!med.lastTaken) return { isEarly: false, hoursLeft: "0", nextDueAt: null };
  const gap = hoursBetweenDoses(med);
  const diffHours = (Date.now() - new Date(med.lastTaken).getTime()) / HOUR;
  return {
    nextDueAt: new Date(new Date(med.lastTaken).getTime() + gap * HOUR),
    // inside the "due soon" window it's fine to take it; earlier than that is an early dose
    isEarly: diffHours < gap - DUE_SOON_MINUTES / 60,
    hoursLeft: Math.max(0, gap - diffHours).toFixed(1),
  };
};

export type DoseState =
  | { kind: "finished" }
  | { kind: "lapsed"; since: Date | null }
  | { kind: "not-started" }
  | { kind: "taken"; nextDueAt: Date }
  | { kind: "due-soon"; dueAt: Date }
  | { kind: "due"; dueAt: Date }
  | { kind: "missed"; dueAt: Date; missedDoses: number };

/**
 * Where a medicine stands right now:
 * - taken:    last dose was recent; the next one isn't due yet
 * - due-soon: the next dose is due within DUE_SOON_MINUTES
 * - due:      the next dose is due (within the grace window)
 * - missed:  past the grace window; missedDoses counts the skipped slots
 * - lapsed:  untouched for longer than the rest of the course would have taken, so it
 *            was abandoned rather than missed (since = last dose, or null if never started)
 *
 * prescribedAt (the visit date) lets a course that was never started lapse too.
 */
export const getDoseState = (med: any, now = Date.now(), prescribedAt?: Date | null): DoseState => {
  if (med.status === "Completed" || med.remainingQuantity <= 0) return { kind: "finished" };

  const gapMs = hoursBetweenDoses(med) * HOUR;
  // how long the doses still left would take, plus a day of slack
  const restOfCourseMs = med.remainingQuantity * gapMs + 24 * HOUR;

  if (!med.lastTaken) {
    if (prescribedAt && now - prescribedAt.getTime() > restOfCourseMs) return { kind: "lapsed", since: null };
    return { kind: "not-started" };
  }

  const lastTaken = new Date(med.lastTaken);
  const dueAt = new Date(lastTaken.getTime() + gapMs);
  if (now < dueAt.getTime()) {
    return dueAt.getTime() - now <= DUE_SOON_MINUTES * 60_000
      ? { kind: "due-soon", dueAt }
      : { kind: "taken", nextDueAt: dueAt };
  }

  const overdueMs = now - dueAt.getTime();
  if (overdueMs <= GRACE_HOURS * HOUR) return { kind: "due", dueAt };
  if (overdueMs > restOfCourseMs) return { kind: "lapsed", since: lastTaken };

  // one missed for the dose that was due, plus one for every full gap since
  const missedDoses = Math.min(1 + Math.floor(overdueMs / gapMs), med.remainingQuantity);
  return { kind: "missed", dueAt, missedDoses };
};

/** 86_100_000 -> "23h 55m", 720_000 -> "12 min". */
export const formatDuration = (ms: number): string => {
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** "12:52 PM", "12:52 PM tomorrow" or "12:52 PM, 3 Nov". */
export const formatDueTime = (at: Date, now = Date.now()): string => {
  const time = at.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(at) - day(new Date(now))) / (24 * HOUR));
  if (days === 0) return time;
  if (days === 1) return `${time} tomorrow`;
  return `${time}, ${at.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
};

export const getAdherenceStats = (med: any) => {
  const total = med.totalQuantity || 1;
  const remaining = med.remainingQuantity ?? total;
  const rate = Math.min(100, Math.round(((total - remaining) / total) * 100));
  return { rate };
};

/** "1_11_2026" -> "Sun, 1 Nov 2026" */
export const slotDateFormat = (slotDate: string) => {
  const [day, month, year] = slotDate.split("_").map(Number);
  if (!day || !month || !year) return slotDate.replaceAll("_", "/");
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
