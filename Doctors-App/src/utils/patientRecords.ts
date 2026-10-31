import type { Appointment, PrescribedMedicine } from "@/types";
import { getDoseState, slotToDate, type DoseState } from "./medicationUtils";

export type ActiveMedicine = {
  appointmentId: string;
  doctorName: string;
  med: PrescribedMedicine;
  state: DoseState;
};

const visitTime = (a: Appointment) => slotToDate(a.slotDate, a.slotTime)?.getTime() ?? 0;

/** Completed visits, newest first. */
export const completedVisits = (appointments: Appointment[]) =>
  appointments.filter((a) => a.isCompleted).sort((x, y) => visitTime(y) - visitTime(x));

/** Medicines still being taken, across all visits, with where each one stands now. */
export const activeMedicines = (appointments: Appointment[], now = Date.now()): ActiveMedicine[] =>
  completedVisits(appointments)
    .flatMap((a) =>
      (a.healthData?.prescribedMedicines ?? []).map((med) => ({
        appointmentId: a._id,
        doctorName: a.docData?.name ?? "Your doctor",
        med,
        state: getDoseState(med, now),
      })),
    )
    .filter((m) => m.state.kind !== "finished");

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
