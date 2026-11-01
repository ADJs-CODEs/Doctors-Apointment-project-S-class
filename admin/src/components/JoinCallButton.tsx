"use client";

import { RiTimeLine, RiVideoOnLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/navigation";

// same window the server enforces (Backend appointments/video.service.ts)
const JOIN_EARLY = 10 * 60_000;
const JOIN_LATE = 60 * 60_000;

/** "27_3_2026" + "10:30 am" -> Date in this browser's time. */
function slotStart(slotDate: string, slotTime: string) {
  const [d, m, y] = slotDate.split("_").map(Number);
  const t = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(slotTime.trim());
  if (!d || !m || !y || !t) return null;
  let h = Number(t[1]) % 12;
  if (t[3].toLowerCase() === "pm") h += 12;
  return new Date(y, m - 1, d, h, Number(t[2]));
}

export function callState(slotDate: string, slotTime: string, now = Date.now()) {
  const start = slotStart(slotDate, slotTime);
  if (!start) return { state: "ended" as const, opensAt: null };
  const opensAt = new Date(start.getTime() - JOIN_EARLY);
  if (now < opensAt.getTime()) return { state: "early" as const, opensAt };
  if (now > start.getTime() + JOIN_LATE) return { state: "ended" as const, opensAt };
  return { state: "open" as const, opensAt };
}

/** "Join call" for a doctor's video appointment; shows when it opens until then. */
export default function JoinCallButton({
  appointment,
  className = "",
}: {
  appointment: { _id: string; slotDate: string; slotTime: string };
  className?: string;
}) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const { state, opensAt } = callState(appointment.slotDate, appointment.slotTime, now);
  if (state === "ended") return null;

  if (state === "early") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 text-[11px] font-bold ${className}`}
        title="The call opens 10 minutes before"
      >
        <RiTimeLine size={14} />
        Opens {opensAt?.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/doctor-call/${appointment._id}`);
      }}
      className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-[11px] font-black hover:bg-violet-700 ${className}`}
    >
      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
      <RiVideoOnLine size={15} /> Join call
    </button>
  );
}
