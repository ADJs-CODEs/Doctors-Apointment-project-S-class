"use client";

import { RiCapsuleLine, RiCheckDoubleLine, RiCheckLine } from "@remixicon/react";
import { type Ref, useEffect, useState } from "react";
import type { PrescribedMedicine } from "@/types";
import {
  describeSchedule,
  type DoseState,
  doseUrgency,
  formatDueTime,
  formatDuration,
  getAdherenceStats,
  hoursBetweenDoses,
} from "@/utils/medicationUtils";

const timeLabel = (at: Date) =>
  at.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

const dayLabel = (at: Date) => at.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const ago = (at: Date) => {
  const mins = Math.round((Date.now() - at.getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

export function doseStatusLabel(state: DoseState): { text: string; tone: string } {
  switch (state.kind) {
    case "not-started":
      return { text: "Take your first dose", tone: "text-teal-700 bg-teal-50" };
    case "due-soon":
      return { text: `Due at ${timeLabel(state.dueAt)}`, tone: "text-orange-700 bg-orange-100" };
    case "due":
      return { text: "Take it now", tone: "text-orange-700 bg-orange-100" };
    case "missed":
      return {
        text: `${state.missedDoses} missed · due ${ago(state.dueAt)}`,
        tone: "text-red-700 bg-red-100",
      };
    case "taken":
      return { text: "Taken · on track", tone: "text-teal-700 bg-teal-50" };
    case "finished":
      return { text: "Course finished", tone: "text-slate-500 bg-slate-100" };
    case "lapsed":
      return {
        text: state.since ? `Not taken since ${dayLabel(state.since)}` : "Never started",
        tone: "text-slate-500 bg-slate-100",
      };
  }
}

/** Ticks every 30s so a countdown stays current. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Shown instead of the button after a dose: time to the next one, filling up as it nears. */
function NextDoseCountdown({
  med,
  nextDueAt,
  onTakeEarly,
  disabled,
}: {
  med: PrescribedMedicine;
  nextDueAt: Date;
  onTakeEarly: () => void;
  disabled: boolean;
}) {
  const now = useNow();
  const gapMs = hoursBetweenDoses(med) * 60 * 60 * 1000;
  const leftMs = Math.max(0, nextDueAt.getTime() - now);
  const elapsed = Math.min(100, Math.max(0, Math.round((1 - leftMs / gapMs) * 100)));

  return (
    <div className="shrink-0 w-32 sm:w-44 text-right">
      <p className="text-[12px] font-semibold text-ink-3">Next dose in</p>
      <p className="num text-base sm:text-lg text-ink leading-tight">
        {formatDuration(leftMs)}
      </p>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
        <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${elapsed}%` }} />
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-1 text-[11px]">
        <span className="text-ink-3 truncate">{formatDueTime(nextDueAt, now)}</span>
        <span className="text-slate-200">·</span>
        <button
          onClick={onTakeEarly}
          disabled={disabled}
          className="font-bold text-orange-600 underline decoration-orange-300 underline-offset-2 hover:text-orange-700 hover:decoration-orange-500 disabled:opacity-50 whitespace-nowrap"
        >
          Took it early?
        </button>
      </div>
    </div>
  );
}

/** One medicine with its dose status and, while the course is running, an "I took it" button. */
export default function MedicineRow({
  med,
  state,
  doctorName,
  busy,
  disabled,
  onTake,
  highlighted = false,
  ref,
}: {
  med: PrescribedMedicine;
  state: DoseState;
  doctorName?: string;
  busy: boolean;
  disabled: boolean;
  onTake: () => void;
  highlighted?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const { rate } = getAdherenceStats(med);
  const status = doseStatusLabel(state);
  const finished = state.kind === "finished";
  const urgency = doseUrgency(state);

  // orange = take it now, red = missed; tinted rows with a coloured edge so they stand out
  const rowTone =
    urgency === "missed"
      ? "bg-red-50/70 border-l-4 border-red-500"
      : urgency === "due"
        ? "bg-orange-50/70 border-l-4 border-orange-400"
        : highlighted
          ? "bg-teal-50/70"
          : "";

  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 py-4 transition-colors ${
        rowTone ? `-mx-3 px-3 rounded-2xl my-1 ${rowTone}` : "first:pt-0 last:pb-0"
      } ${highlighted && urgency ? "ring-2 ring-teal-300" : ""}`}
    >
      <div
        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
          urgency === "missed"
            ? "bg-red-100 text-red-600"
            : urgency === "due"
              ? "bg-orange-100 text-orange-600"
              : finished || state.kind === "lapsed"
                ? "bg-slate-100 text-slate-400"
                : "bg-teal-50 text-teal-600"
        }`}
      >
        <RiCapsuleLine size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={`text-[16px] font-bold truncate capitalize ${finished ? "text-ink-3" : "text-ink"}`}
          >
            {med.name}
          </p>
          <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${status.tone}`}>
            {status.text}
          </span>
        </div>
        <p className="text-[13px] text-ink-3 mt-0.5 truncate">
          {describeSchedule(med)} · {finished ? `${med.totalQuantity} prescribed` : `${med.remainingQuantity} left`} ·{" "}
          {rate}% taken
          {doctorName ? ` · ${doctorName}` : ""}
        </p>
      </div>
      {finished ? (
        <RiCheckDoubleLine size={20} className="text-teal-500 shrink-0 mr-2" />
      ) : state.kind === "taken" ? (
        <NextDoseCountdown med={med} nextDueAt={state.nextDueAt} onTakeEarly={onTake} disabled={disabled} />
      ) : (
        <button
          onClick={onTake}
          disabled={disabled}
          title="I took this dose"
          className={`btn shrink-0 !py-2 !px-3.5 !text-[14px] !rounded-xl ${
            urgency === "missed"
              ? "text-white border border-rose-700 bg-[linear-gradient(180deg,#F05468,#D62F45)] shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_6px_14px_rgba(214,47,69,.25)]"
              : urgency === "due"
                ? "text-white border border-amber-700 bg-[linear-gradient(180deg,#F7A93B,#D97706)] shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_6px_14px_rgba(217,119,6,.25)]"
                : state.kind === "not-started"
                  ? "btn-ink"
                  : "btn-glass !bg-white"
          }`}
        >
          {busy ? (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <RiCheckLine size={15} />
          )}
          <span className="hidden sm:inline">I took it</span>
        </button>
      )}
    </div>
  );
}
