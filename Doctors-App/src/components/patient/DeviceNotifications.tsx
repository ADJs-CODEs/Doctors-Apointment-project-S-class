"use client";

import { RiCloseLine, RiNotification3Line, RiShareBoxLine } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { disablePush, enablePush, type PushState, pushState } from "@/utils/push";

const DISMISS_KEY = "push-card-dismissed";

/** Whether device notifications are on for this browser, with on/off actions. */
export function useDeviceNotifications() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const next = await enablePush();
      setState(next);
      if (next === "on") toast.success("Notifications are on for this device");
      else if (next === "denied") toast.error("Notifications are blocked. Allow them in your browser's site settings.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't turn on notifications");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await disablePush();
      setState("off");
      toast.message("Notifications are off for this device");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}

/** One-time card asking to turn device notifications on. Hidden once on or dismissed. */
export function DeviceNotificationsCard() {
  const { state, busy, enable } = useDeviceNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // fine: it just shows again next time
    }
  };

  if (dismissed || (state !== "off" && state !== "needs-install")) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[24px] border border-teal-100 bg-gradient-to-r from-teal-50 to-white">
      <div className="flex gap-4 items-start flex-1 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-teal-500 text-white flex items-center justify-center shrink-0">
          <RiNotification3Line size={22} />
        </div>
        <div className="min-w-0">
          <p className="font-black text-slate-900">Get reminders on this device</p>
          {state === "needs-install" ? (
            <p className="text-sm text-slate-600 mt-0.5">
              On iPhone, tap <RiShareBoxLine size={14} className="inline -mt-0.5" /> <strong>Share</strong> then{" "}
              <strong>Add to Home Screen</strong>, open the app from there, and turn notifications on.
            </p>
          ) : (
            <p className="text-sm text-slate-600 mt-0.5">
              Dose reminders, missed doses, messages from your doctor and appointment alerts, even when this tab
              is closed.
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {state === "off" && (
          <button
            onClick={enable}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-bold hover:bg-teal-600 disabled:opacity-60 transition-colors"
          >
            {busy ? "Turning on…" : "Turn on"}
          </button>
        )}
        <button
          onClick={dismiss}
          className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100"
          aria-label="Not now"
          title="Not now"
        >
          <RiCloseLine size={18} />
        </button>
      </div>
    </div>
  );
}

/** Compact switch for the bell panel / settings. */
export function DeviceNotificationsSwitch() {
  const { state, busy, enable, disable } = useDeviceNotifications();
  if (!state || state === "unsupported") return null;

  const on = state === "on";
  const hint =
    state === "denied"
      ? "Blocked in your browser settings"
      : state === "needs-install"
        ? "Add to Home Screen first"
        : on
          ? "On for this device"
          : "Get alerts when the site is closed";

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-50 bg-slate-50/60">
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-slate-800">Device notifications</p>
        <p className="text-[11px] text-slate-400 truncate">{hint}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        disabled={busy || state === "denied" || state === "needs-install"}
        onClick={on ? disable : enable}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${on ? "bg-teal-500" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : ""}`}
        />
      </button>
    </div>
  );
}
