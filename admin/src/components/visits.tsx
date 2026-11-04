"use client";

import { RiHospitalLine, RiVideoOnLine } from "@remixicon/react";
import { useState } from "react";
import type { Appointment } from "../types/index";

/**
 * Small pieces shared by the doctor's Schedule and the admin's Appointments page, so the two
 * show visits the same way.
 */

/** A photo, or the person's initials when there isn't one (or it won't load). */
export function Avatar({ src, name, size = "md" }: { src?: string; name: string; size?: "sm" | "md" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "sm" ? "w-8 h-8 rounded-xl text-[11px]" : "w-12 h-12 rounded-2xl";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (!src || broken) {
    return <div className={`${box} bg-brand-soft text-brand-ink font-bold flex items-center justify-center shrink-0`}>{initials || "?"}</div>;
  }
  return <img className={`${box} object-cover object-top bg-slate-100 shrink-0`} src={src} alt="" onError={() => setBroken(true)} />;
}

export const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// a visit counts as "upcoming" until an hour after it starts; after that it needs closing
export const STILL_UPCOMING_MS = 60 * 60_000;

/** "6_4_2026" + "02:30 PM" -> a Date in local time (for sorting and the Today/Tomorrow headings). */
export function slotStart(a: Appointment) {
  const [d, m, y] = a.slotDate.split("_").map(Number);
  const t = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(a.slotTime.trim());
  if (!d || !m || !y) return new Date(0);
  let h = t ? Number(t[1]) % 12 : 0;
  if (t && t[3].toLowerCase() === "pm") h += 12;
  return new Date(y, m - 1, d, h, t ? Number(t[2]) : 0);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
export function dayHeading(d: Date) {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export const isOpen = (a: Appointment) => !a.isCompleted && !a.cancelled && !a.missed;
export const earlyDose = (a: Appointment) => !!a.healthData?.prescribedMedicines?.some((m) => m.overdoseAlert);
export const isCritical = (a: Appointment) => a.patientStatus === "Critical" || earlyDose(a);

/** Why this patient needs attention, in words. */
export const criticalReason = (a: Appointment) =>
  earlyDose(a) && a.patientStatus === "Critical"
    ? "Took a dose early, and marked critical"
    : earlyDose(a)
      ? "Took a dose early"
      : "Marked critical (urgent message)";

export type VisitTab = "upcoming" | "toClose" | "attention" | "completed" | "closed";

/** The same five lists on both sides. */
export function sortVisits(all: Appointment[]) {
  const byTimeAsc = (a: Appointment, b: Appointment) => slotStart(a).getTime() - slotStart(b).getTime();
  const byTimeDesc = (a: Appointment, b: Appointment) => -byTimeAsc(a, b);
  const cutoff = Date.now() - STILL_UPCOMING_MS;
  return {
    upcoming: all.filter((a) => isOpen(a) && slotStart(a).getTime() >= cutoff).sort(byTimeAsc),
    // their time has passed but nobody marked them completed or missed
    toClose: all.filter((a) => isOpen(a) && slotStart(a).getTime() < cutoff).sort(byTimeDesc),
    attention: all.filter((a) => isCritical(a) && !a.cancelled).sort(byTimeDesc),
    completed: all.filter((a) => a.isCompleted).sort(byTimeDesc),
    closed: all.filter((a) => a.cancelled || a.missed).sort(byTimeDesc),
  } satisfies Record<VisitTab, Appointment[]>;
}

/** The row of tab buttons with counts. */
export function VisitTabs({
  tabs,
  current,
  onChange,
}: {
  tabs: { id: VisitTab; label: string; count: number; tone?: string }[];
  current: VisitTab;
  onChange: (t: VisitTab) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-bold transition-colors ${
            current === t.id ? "btn-ink" : "bg-white border border-line text-ink-2 hover:border-ink-3/40"
          }`}
        >
          {t.label}
          {t.count > 0 && (
            <span
              className={`num min-w-5 h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center ${
                t.tone ?? (current === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Video or clinic, and whether it's paid. */
export function VisitPills({ item, currency }: { item: Appointment; currency: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {item.kind === "video" ? (
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-video bg-video-soft border border-violet-100 px-2 py-0.5 rounded-full">
          <RiVideoOnLine size={13} /> Video call
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-ink bg-brand-soft border border-teal-100 px-2 py-0.5 rounded-full">
          <RiHospitalLine size={12} /> At the clinic
        </span>
      )}
      <span
        className={`text-[12px] font-bold px-2 py-0.5 rounded-full border ${
          !item.payment ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-600 border-slate-200"
        }`}
      >
        {!item.payment
          ? "Not paid yet"
          : `Paid ${currency}${Number(item.amount).toLocaleString("en-US")} · ${item.paymentMethod === "wallet" ? "wallet" : "card"}`}
      </span>
    </div>
  );
}

/** The date block on the left of a visit card. */
export function DateBlock({ item }: { item: Appointment }) {
  const start = slotStart(item);
  return (
    <div className="flex md:flex-col items-center gap-3 md:gap-0 md:w-20 shrink-0">
      <div className="btn-ink w-14 h-14 md:w-16 md:h-16 rounded-[16px] flex flex-col items-center justify-center">
        <span className="num text-[22px] leading-none">{start.getDate()}</span>
        <span className="text-[12px] font-semibold text-[#8FE3E1]">{MONTH[start.getMonth()]}</span>
      </div>
      <p className="num text-[14px] text-ink md:mt-1.5">{item.slotTime}</p>
    </div>
  );
}
