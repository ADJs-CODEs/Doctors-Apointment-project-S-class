"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppContext } from "@/Context/AppContext";
import type { AppContextType, Appointment, PrescribedMedicine } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { getDoseState, getDoseStatus, slotToDate, type DoseState } from "@/utils/medicationUtils";

export type ActiveMedicine = {
  appointmentId: string;
  doctorName: string;
  med: PrescribedMedicine;
  state: DoseState;
};

export type WishWellEntry = {
  _id: string;
  patientName: string;
  patientImage: string;
  condition: string;
  status: "critical" | "recovered" | "passed";
  totalEmojis: number;
};

type Person = { _id: string; name: string; image?: string; email?: string };
type Connection = { _id: string; patient?: Person; watcher?: Person; requester?: Person };
type Notification = { _id: string; title: string; message: string; isRead: boolean; createdAt: string };

const settledData = <T,>(result: PromiseSettledResult<{ data: any }>, key: string, fallback: T): T =>
  result.status === "fulfilled" && result.value.data?.success ? (result.value.data[key] ?? fallback) : fallback;

/** Everything the patient dashboard shows, loaded together. */
export function useDashboard() {
  const { token } = useContext(AppContext) as AppContextType;

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [watching, setWatching] = useState<Connection[]>([]);
  const [watchers, setWatchers] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [wishWell, setWishWell] = useState<WishWellEntry[]>([]);
  const [loggingDose, setLoggingDose] = useState<string | null>(null);
  // re-evaluated every minute so "due"/"missed" stay current while the page is open
  const [now, setNow] = useState(() => Date.now());

  const loadAppointments = useCallback(async () => {
    const { data } = await axiosInstance.get(API_PATHS.USER.FETCH_APPOINTMENT);
    if (data.success) setAppointments(data.appointments);
  }, []);

  const load = useCallback(async () => {
    // independent sections: one failing shouldn't blank the whole dashboard
    const [appts, notes, watchingRes, watchersRes, requestsRes, wishRes] = await Promise.allSettled([
      axiosInstance.get(API_PATHS.USER.FETCH_APPOINTMENT),
      axiosInstance.get(API_PATHS.NOTIFICATIONS.GET),
      axiosInstance.get(API_PATHS.CONNECTIONS.WATCHING_OVER),
      axiosInstance.get(API_PATHS.CONNECTIONS.MY_WATCHERS),
      axiosInstance.get(API_PATHS.CONNECTIONS.MY_REQUESTS),
      axiosInstance.get(API_PATHS.WISH_WELL.ALL),
    ]);
    if (appts.status === "rejected") toast.error("Couldn't load your appointments");
    setAppointments(settledData(appts, "appointments", []));
    setNotifications(settledData(notes, "notifications", []));
    setWatching(settledData(watchingRes, "watching", []));
    setWatchers(settledData(watchersRes, "watchers", []));
    setPendingRequests(settledData(requestsRes, "requests", []));
    setWishWell(settledData(wishRes, "entries", []));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const view = useMemo(() => {
    const upcoming = appointments
      .filter((a) => !a.cancelled && !a.isCompleted)
      .map((a) => ({ appointment: a, at: slotToDate(a.slotDate, a.slotTime) }))
      // keep visits from the last hour (in progress); drop older unattended ones
      .filter(({ at }) => at && at.getTime() > now - 60 * 60 * 1000)
      .sort((x, y) => x.at!.getTime() - y.at!.getTime());

    const completed = appointments
      .filter((a) => a.isCompleted && a.healthData)
      .sort(
        (x, y) =>
          (slotToDate(y.slotDate, y.slotTime)?.getTime() ?? 0) -
          (slotToDate(x.slotDate, x.slotTime)?.getTime() ?? 0),
      );

    const medicines: ActiveMedicine[] = completed
      .flatMap((a) =>
        (a.healthData?.prescribedMedicines ?? []).map((med) => ({
          appointmentId: a._id,
          doctorName: a.docData?.name ?? "Your doctor",
          med,
          state: getDoseState(med, now),
        })),
      )
      .filter((m) => m.state.kind !== "finished");

    const latestReport =
      completed.find((a) => a.healthData?.heartRate || a.healthData?.bloodPressure || a.healthData?.doctorNotes) ??
      null;

    // newest doctor message across all appointments
    const doctorMessage =
      appointments
        .flatMap((a) =>
          (a.messages ?? []).map((m) => ({
            ...m,
            doctorName: a.docData?.name,
            critical: a.patientStatus === "Critical",
          })),
        )
        .sort((x, y) => new Date(y.sentAt).getTime() - new Date(x.sentAt).getTime())[0] ?? null;

    return {
      upcoming,
      nextAppointment: upcoming[0] ?? null,
      medicines,
      missed: medicines.filter((m) => m.state.kind === "missed"),
      latestReport,
      doctorMessage,
      isCritical: appointments.some((a) => a.patientStatus === "Critical" && !a.cancelled),
      criticalWishWell: wishWell.filter((e) => e.status === "critical"),
      unreadNotifications: notifications.filter((n) => !n.isRead),
    };
  }, [appointments, notifications, wishWell, now]);

  /** Same rules as My Appointments: an early dose asks first and alerts the doctor. */
  const logDose = useCallback(
    async ({ appointmentId, med }: ActiveMedicine) => {
      if (loggingDose) return;
      const { isEarly, hoursLeft } = getDoseStatus(med);
      let overdoseAlert = false;
      if (isEarly) {
        const ok = window.confirm(
          `⚠️ Your next ${med.name} dose isn't due for ${hoursLeft} more hours. Taking it early will notify your doctor. Log it anyway?`,
        );
        if (!ok) return;
        overdoseAlert = true;
      }
      setLoggingDose(`${appointmentId}-${med.name}`);
      try {
        const { data } = await axiosInstance.post(API_PATHS.USER.LOG_DOSE, {
          appointmentId,
          medicineName: med.name,
          overdoseAlert,
        });
        if (data.success) {
          toast.success(`${med.name} logged`);
          await loadAppointments();
        } else {
          toast.error(data.message);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message);
      } finally {
        setLoggingDose(null);
      }
    },
    [loggingDose, loadAppointments],
  );

  const [paying, setPaying] = useState(false);
  const payForAppointment = useCallback(async (appointmentId: string) => {
    setPaying(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.STRIPE_AUTH, { appointmentId });
      if (data.success) window.location.assign(data.session_url);
      else toast.error(data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setPaying(false);
    }
  }, []);

  return {
    loading,
    ...view,
    watching,
    watchers,
    pendingRequests,
    notifications,
    loggingDose,
    logDose,
    paying,
    payForAppointment,
  };
}
