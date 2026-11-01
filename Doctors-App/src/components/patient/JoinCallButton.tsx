"use client";

import { RiTimeLine, RiVideoOnLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/navigation";
import { slotToDate } from "@/utils/medicationUtils";

// same window the server enforces (appointments/video.service.ts)
const JOIN_EARLY = 10 * 60_000;
const JOIN_LATE = 60 * 60_000;

export type CallWindow = { state: "early" | "open" | "ended"; opensAt: Date | null };

/** Where a video appointment stands right now: not open yet, open, or over. */
export function callWindow(slotDate: string, slotTime: string, now = Date.now()): CallWindow {
  const start = slotToDate(slotDate, slotTime);
  if (!start) return { state: "ended", opensAt: null };
  const opensAt = new Date(start.getTime() - JOIN_EARLY);
  if (now < opensAt.getTime()) return { state: "early", opensAt };
  if (now > start.getTime() + JOIN_LATE) return { state: "ended", opensAt };
  return { state: "open", opensAt };
}

/** Re-checks every 30s so the button turns on by itself when the call opens. */
export function useCallWindow(slotDate: string, slotTime: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return callWindow(slotDate, slotTime, now);
}

const opensLabel = (d: Date) => {
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  return sameDay ? time : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`;
};

/** "Join call" for a video appointment; shows when it opens until then. */
export default function JoinCallButton({
  appointment,
  className = "",
  compact = false,
}: {
  appointment: { _id: string; slotDate: string; slotTime: string };
  className?: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const { state, opensAt } = useCallWindow(appointment.slotDate, appointment.slotTime);
  if (state === "ended") return null;

  const size = compact ? "px-3 py-2 rounded-xl text-[11px]" : "px-5 py-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs";
  if (state === "early") {
    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 border border-violet-100 bg-violet-50 text-violet-600 font-bold ${size} ${className}`}
        title="The call opens 10 minutes before the appointment"
      >
        <RiTimeLine size={15} /> Opens {opensAt ? opensLabel(opensAt) : "soon"}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/call/${appointment._id}`);
      }}
      className={`relative inline-flex items-center justify-center gap-1.5 bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors ${size} ${className}`}
    >
      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
      <RiVideoOnLine size={16} /> Join call
    </button>
  );
}
