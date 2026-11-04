import type { Appointment, PrescribedMedicine } from "@/types";
import { getDoseState, slotToDate, type DoseState } from "./medicationUtils";

export type ActiveMedicine = {
  appointmentId: string;
  doctorName: string;
  med: PrescribedMedicine;
  state: DoseState;
};

const visitTime = (a: Appointment) => slotToDate(a.slotDate, a.slotTime)?.getTime() ?? 0;

// a visit still counts as upcoming for an hour after it starts (it may be under way)
const STILL_ON_MS = 60 * 60 * 1000;

/** Still to happen: held, or not closed and its time hasn't passed. Everything else is past. */
export const isUpcomingVisit = (a: Appointment, now = Date.now()) => {
  if (a.cancelled || a.isCompleted || a.missed) return false;
  if (a.holdExpiresAt && !a.payment) return true;
  const start = slotToDate(a.slotDate, a.slotTime);
  return !start || start.getTime() > now - STILL_ON_MS;
};

/** When the visit starts (0 if the slot text can't be read), for sorting. */
export const visitStart = visitTime;

/** Completed visits, newest first. */
export const completedVisits = (appointments: Appointment[]) =>
  appointments.filter((a) => a.isCompleted).sort((x, y) => visitTime(y) - visitTime(x));

/** Where one medicine from this visit stands now. */
export const medicineState = (visit: Appointment, med: PrescribedMedicine, now = Date.now()) =>
  getDoseState(med, now, slotToDate(visit.slotDate, visit.slotTime));

/**
 * Medicines the patient is currently on, across all visits. Finished courses and
 * lapsed ones (abandoned long ago) are left out.
 */
export const activeMedicines = (appointments: Appointment[], now = Date.now()): ActiveMedicine[] =>
  completedVisits(appointments)
    .flatMap((a) =>
      (a.healthData?.prescribedMedicines ?? []).map((med) => ({
        appointmentId: a._id,
        doctorName: a.docData?.name ?? "Your doctor",
        med,
        state: medicineState(a, med, now),
      })),
    )
    .filter((m) => m.state.kind !== "finished" && m.state.kind !== "lapsed");

/**
 * The newest visit where the doctor actually recorded something. Every appointment
 * carries a healthData object (empty until the doctor fills it in), so "has healthData"
 * isn't enough.
 */
export const latestRecordedVisit = (appointments: Appointment[]) =>
  completedVisits(appointments).find(
    (a) => a.healthData?.heartRate || a.healthData?.bloodPressure || a.healthData?.temperature || a.healthData?.doctorNotes,
  ) ?? null;

/** "21_3_2026" -> "21 Mar 2026" */
export const formatVisitDate = (a: Appointment) =>
  slotToDate(a.slotDate, a.slotTime)?.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) ?? a.slotDate.replace(/_/g, "/");
