"use client";

import { RiCalendarCloseLine, RiCloseLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Appointment } from "../types/index";
import { API_PATHS } from "../utils/apiPath";
import axiosInstance from "../utils/axiosInstance";

/** "27_3_2026" + "10:30 am" -> Date in this browser's time (good enough for showing a button). */
function slotStart(a: Appointment) {
  const [d, m, y] = a.slotDate.split("_").map(Number);
  const t = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(a.slotTime.trim());
  if (!d || !m || !y || !t) return null;
  let h = Number(t[1]) % 12;
  if (t[3].toLowerCase() === "pm") h += 12;
  return new Date(y, m - 1, d, h, Number(t[2]));
}

/** Open (not done, cancelled or missed) and its start time has passed. */
export const canMarkMissed = (a: Appointment) => {
  const start = slotStart(a);
  return !a.cancelled && !a.isCompleted && !a.missed && !!start && start.getTime() <= Date.now();
};

/** Badge for a missed appointment, with where its refund stands. */
export function MissedBadge({ item, currency }: { item: Appointment; currency: string }) {
  const byPatient = item.missed?.by === "patient";
  const r = item.refund;
  return (
    <div className="flex flex-col items-center lg:items-end gap-1 w-full lg:w-auto">
      <span
        className={`text-[12px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${
          byPatient ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-rose-50 text-rose-600 border-rose-100"
        }`}
      >
        {byPatient ? "Patient didn't come" : "Doctor missed it"}
        {item.missed?.markedBy === "system" ? " · automatic" : ""}
      </span>
      {r && (
        <span
          title={r.error}
          className={`num text-[11px] ${r.status === "refunded" ? "text-brand-ink" : "text-rose-600"}`}
        >
          {r.percent}% · {currency}
          {r.amount} {r.status === "refunded" ? "refunded" : "to refund by hand"}
        </span>
      )}
    </div>
  );
}

/**
 * Confirm a no-show. Doctors can only record that the patient didn't come; the admin
 * chooses who missed it.
 */
export default function MissedAppointmentModal({
  appointment,
  role,
  currency,
  onClose,
  onDone,
}: {
  appointment: Appointment | null;
  role: "doctor" | "admin";
  currency: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [by, setBy] = useState<"patient" | "doctor">("patient");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBy("patient");
  }, [appointment]);

  useEffect(() => {
    if (!appointment) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appointment, onClose]);

  const percent = by === "patient" ? 50 : 100;
  const refund = appointment ? Math.round(appointment.amount * percent) / 100 : 0;

  const confirm = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      const { data } =
        role === "doctor"
          ? await axiosInstance.post(API_PATHS.DOCTOR.MARK_NO_SHOW, { appointmentId: appointment._id })
          : await axiosInstance.post(API_PATHS.ADMIN.MARK_MISSED, { appointmentId: appointment._id, by });
      if (data.success) {
        toast.success(data.message);
        onDone();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {appointment && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white rounded-[24px] shadow-2xl p-6 sm:p-7"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
                <RiCalendarCloseLine size={24} />
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-ink-3 hover:bg-canvas" aria-label="Close">
                <RiCloseLine size={20} />
              </button>
            </div>

            <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">
              {role === "doctor" ? "Patient didn't show?" : "Mark as missed"}
            </h2>
            <p className="text-[14px] text-ink-2 mt-1">
              {appointment.userData.name} · {appointment.slotDate.replace(/_/g, "/")} at {appointment.slotTime}
            </p>

            {role === "admin" && (
              <div className="grid grid-cols-2 gap-2 mt-5">
                {(["patient", "doctor"] as const).map((who) => (
                  <button
                    key={who}
                    onClick={() => setBy(who)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                      by === who ? "btn-ink border-transparent" : "border-line hover:border-ink-3/40"
                    }`}
                  >
                    <p className="text-[14px] font-bold">{who === "patient" ? "Patient missed it" : "Doctor missed it"}</p>
                    <p className={`text-[12px] ${by === who ? "text-white/70" : "text-ink-3"}`}>
                      {who === "patient" ? "50% refund" : "100% refund"}
                    </p>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-canvas border border-line px-4 py-3 text-[14px] text-ink-2 space-y-1">
              {appointment.payment ? (
                <p>
                  <span className="num text-ink">
                    {percent}% ({currency}
                    {refund})
                  </span>{" "}
                  goes back to the patient{appointment.paymentMethod === "wallet" ? "'s wallet" : "'s card"}
                  {by === "patient" ? `; ${currency}${appointment.amount - refund} is kept for the reserved time.` : "."}
                </p>
              ) : (
                <p>This visit wasn&apos;t paid online, so there&apos;s nothing to refund.</p>
              )}
              <p className="text-[13px] text-ink-3">
                The patient {role === "doctor" ? "and you are" : "and doctor are"} emailed and notified. This can&apos;t
                be undone.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-5 py-3 rounded-xl border border-line bg-white text-ink-2 text-[15px] font-bold hover:bg-canvas"
              >
                Go back
              </button>
              <button
                onClick={confirm}
                disabled={saving}
                className="flex-1 px-5 py-3 rounded-xl bg-orange-600 text-white text-[15px] font-bold hover:bg-orange-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : role === "doctor" ? "Yes, mark no-show" : "Mark as missed"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
