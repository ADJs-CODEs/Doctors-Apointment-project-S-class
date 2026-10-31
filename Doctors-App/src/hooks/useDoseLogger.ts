"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { PrescribedMedicine } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { getDoseStatus } from "@/utils/medicationUtils";

/**
 * Logs "I took it" for a medicine. An early dose asks first and, if confirmed, is sent
 * with overdoseAlert so the doctor is notified. `onLogged` runs after a successful log
 * (e.g. reload the appointments).
 */
export function useDoseLogger(onLogged: () => Promise<void> | void) {
  const [loggingKey, setLoggingKey] = useState<string | null>(null);

  const logDose = useCallback(
    async (appointmentId: string, med: PrescribedMedicine) => {
      if (loggingKey) return;
      const { isEarly, hoursLeft } = getDoseStatus(med);
      let overdoseAlert = false;
      if (isEarly) {
        const ok = window.confirm(
          `⚠️ Your next ${med.name} dose isn't due for ${hoursLeft} more hours. Taking it early will notify your doctor. Log it anyway?`,
        );
        if (!ok) return;
        overdoseAlert = true;
      }

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
    [loggingKey, onLogged],
  );

  return { logDose, loggingKey };
}

export const doseKey = (appointmentId: string, medicineName: string) => `${appointmentId}-${medicineName}`;
