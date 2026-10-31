"use client";

import { RiCapsuleLine, RiCheckLine } from "@remixicon/react";
import type { PrescribedMedicine } from "@/types";
import { describeSchedule, type DoseState, getAdherenceStats } from "@/utils/medicationUtils";

const timeLabel = (at: Date) =>
  at.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

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
    case "due":
      return { text: "Due now", tone: "text-amber-700 bg-amber-50" };
    case "missed":
      return {
        text: `${state.missedDoses} missed · due ${ago(state.dueAt)}`,
        tone: "text-red-600 bg-red-50",
      };
    case "taken":
      return { text: `Next at ${timeLabel(state.nextDueAt)}`, tone: "text-slate-500 bg-slate-100" };
    case "finished":
      return { text: "Course finished", tone: "text-slate-500 bg-slate-100" };
  }
}

/** One medicine with its dose status and an "I took it" button. */
export default function MedicineRow({
  med,
  state,
  doctorName,
  busy,
  disabled,
  onTake,
}: {
  med: PrescribedMedicine;
  state: DoseState;
  doctorName?: string;
  busy: boolean;
  disabled: boolean;
  onTake: () => void;
}) {
  const { rate } = getAdherenceStats(med);
  const status = doseStatusLabel(state);
  const canTakeNow = state.kind !== "taken";

  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div
        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
          state.kind === "missed" ? "bg-red-50 text-red-500" : "bg-teal-50 text-teal-600"
        }`}
      >
        <RiCapsuleLine size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-black text-slate-900 truncate capitalize">{med.name}</p>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${status.tone}`}>
            {status.text}
          </span>
        </div>
        <p className="text-[12px] text-slate-400 mt-0.5 truncate">
          {describeSchedule(med)} · {med.remainingQuantity} left · {rate}% taken
          {doctorName ? ` · ${doctorName}` : ""}
        </p>
      </div>
      <button
        onClick={onTake}
        disabled={disabled}
        title="I took this dose"
        className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${
          canTakeNow
            ? "bg-slate-900 text-white hover:bg-teal-600"
            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
        }`}
      >
        {busy ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <RiCheckLine size={15} />
        )}
        <span className="hidden sm:inline">I took it</span>
      </button>
    </div>
  );
}
