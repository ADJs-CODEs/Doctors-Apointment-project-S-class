"use client";

import { RiAlarmWarningLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PrescribedMedicine } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { formatDueTime, formatDuration, getDoseStatus } from "@/utils/medicationUtils";

type EarlyDose = { appointmentId: string; med: PrescribedMedicine; nextDueAt: Date };

/**
 * Logs "I took it" for a medicine. An early dose asks first (in a modal) and, if
 * confirmed, is sent with overdoseAlert so the doctor is notified. `onLogged` runs after
 * a successful log (e.g. reload the appointments).
 *
 * Render the returned `dialog` once on the page that uses the hook.
 */
export function useDoseLogger(onLogged: () => Promise<void> | void) {
  const [loggingKey, setLoggingKey] = useState<string | null>(null);
  const [earlyDose, setEarlyDose] = useState<EarlyDose | null>(null);

  const send = useCallback(
    async (appointmentId: string, med: PrescribedMedicine, overdoseAlert: boolean) => {
      setLoggingKey(doseKey(appointmentId, med.name));
      try {
        const { data } = await axiosInstance.post(API_PATHS.USER.LOG_DOSE, {
          appointmentId,
          medicineName: med.name,
          overdoseAlert,
        });
        if (data.success) {
          toast.success(`${med.name} logged`);
          await onLogged();
        } else {
          toast.error(data.message);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message);
      } finally {
        setLoggingKey(null);
      }
    },
    [onLogged],
  );

  const logDose = useCallback(
    (appointmentId: string, med: PrescribedMedicine) => {
      if (loggingKey) return;
      const { isEarly, nextDueAt } = getDoseStatus(med);
      if (isEarly && nextDueAt) setEarlyDose({ appointmentId, med, nextDueAt });
      else send(appointmentId, med, false);
    },
    [loggingKey, send],
  );

  const close = useCallback(() => setEarlyDose(null), []);
  const confirmEarly = () => {
    if (!earlyDose) return;
    close();
    send(earlyDose.appointmentId, earlyDose.med, true);
  };

  // Escape closes the modal
  useEffect(() => {
    if (!earlyDose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [earlyDose, close]);

  const dialog = (
    <AnimatePresence>
      {earlyDose && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="early-dose-title"
            className="w-full max-w-md bg-white rounded-[28px] shadow-2xl p-6 sm:p-7"
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-5">
              <RiAlarmWarningLine size={24} />
            </div>
            <h2 id="early-dose-title" className="text-xl font-black text-slate-900">
              It&apos;s not time for this dose yet
            </h2>
            <p className="text-slate-500 mt-2 leading-relaxed">
              Your next <span className="font-bold text-slate-800 capitalize">{earlyDose.med.name}</span> dose is
              due in{" "}
              <span className="font-bold text-slate-800">
                {formatDuration(earlyDose.nextDueAt.getTime() - Date.now())}
              </span>{" "}
              (at {formatDueTime(earlyDose.nextDueAt)}).
            </p>
            <p className="text-sm text-orange-800 bg-orange-50 rounded-2xl px-4 py-3 mt-4">
              Taking it early counts as an extra dose, and your doctor will be notified.
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
              <button
                onClick={confirmEarly}
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                Log it anyway
              </button>
              <button
                onClick={close}
                autoFocus
                className="flex-1 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-teal-600 transition-colors"
              >
                I&apos;ll wait
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { logDose, loggingKey, dialog };
}

export const doseKey = (appointmentId: string, medicineName: string) => `${appointmentId}-${medicineName}`;
