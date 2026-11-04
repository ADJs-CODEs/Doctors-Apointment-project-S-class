"use client";

import { RiCheckboxCircleLine, RiCloseCircleLine, RiTimeLine, RiVideoOnLine, RiWallet3Line } from "@remixicon/react";
import { useNavigate } from "@/lib/navigation";
import type { Appointment } from "@/types";
import { slotToDate } from "@/utils/medicationUtils";
import { useCallWindow } from "./JoinCallButton";

const time = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

/** "2 h 15 min" / "35 min" / "3 days" */
function until(ms: number) {
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins} min`;
  if (mins < 48 * 60) {
    const h = Math.floor(mins / 60);
    return mins % 60 ? `${h} h ${mins % 60} min` : `${h} h`;
  }
  return `${Math.round(mins / 1440)} days`;
}

/**
 * The status of a video appointment, always spelled out: needs paying, starts in X,
 * live now (Join), or ended. Sits on the appointment card.
 */
export default function VideoCallPanel({ item, onPay }: { item: Appointment; onPay: () => void }) {
  const navigate = useNavigate();
  const { state, opensAt } = useCallWindow(item.slotDate, item.slotTime);
  const start = slotToDate(item.slotDate, item.slotTime);
  const endsAt = start ? new Date(start.getTime() + 60 * 60_000) : null;

  if (item.cancelled || item.missed) return null;

  let tone = "bg-video-soft/60 border-violet-100 text-ink";
  let icon = <RiVideoOnLine size={20} className="text-video" />;
  let title: string;
  let detail: string;
  let action: React.ReactNode = null;

  if (item.isCompleted) {
    tone = "bg-canvas border-line text-ink";
    icon = <RiCheckboxCircleLine size={20} className="text-brand-ink" />;
    title = "Video call completed";
    detail = "Your doctor's notes and prescriptions are in the visit report.";
  } else if (!item.payment && state === "ended") {
    // the time passed without payment: nothing left to pay for
    tone = "bg-canvas border-line text-ink";
    icon = <RiCloseCircleLine size={20} className="text-ink-3" />;
    title = "Not paid in time, so this call didn't go ahead";
    detail = "Nothing was charged. A new time is only booked once it's paid.";
    action = (
      <button
        type="button"
        onClick={() => navigate(`/appointments/${item.docId}?type=video`)}
        className="btn btn-ink shrink-0 !py-2 !px-3.5 !text-[14px] !rounded-xl"
      >
        Book a new time
      </button>
    );
  } else if (!item.payment) {
    tone = "bg-amber-50 border-amber-200 text-amber-900";
    icon = <RiWallet3Line size={20} className="text-amber-600" />;
    title = "Pay to confirm your video call";
    detail = "You can join once it's paid; the call opens 10 minutes before.";
    action = (
      <button type="button" onClick={onPay} className="btn btn-ink shrink-0 !py-2 !px-3.5 !text-[14px] !rounded-xl">
        Pay now
      </button>
    );
  } else if (state === "open") {
    tone = "text-white border-violet-800 bg-[linear-gradient(160deg,#8B5CF6,#6D28D9)] shadow-[inset_0_1px_0_rgba(255,255,255,.2)]";
    icon = <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 ring-4 ring-emerald-300/25" />;
    title = "Your video call is open";
    detail = endsAt ? `Open until ${time(endsAt)}` : "Join now";
    action = (
      <button
        type="button"
        onClick={() => navigate(`/call/${item._id}`)}
        className="btn shrink-0 !py-2 !px-4 !text-[14px] !rounded-xl bg-white text-video hover:bg-violet-50"
      >
        <RiVideoOnLine size={16} /> Join call
      </button>
    );
  } else if (state === "early" && opensAt) {
    title = `Video call starts in ${until((start?.getTime() ?? 0) - Date.now())}`;
    detail = `You can join from ${time(opensAt)}${opensAt.toDateString() === new Date().toDateString() ? " today" : `, ${opensAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}. We'll remind you.`;
    icon = <RiTimeLine size={20} className="text-video" />;
  } else {
    tone = "bg-canvas border-line text-ink-2";
    icon = <RiVideoOnLine size={20} className="text-ink-3" />;
    title = "Video call ended";
    detail = endsAt ? `The call window closed at ${time(endsAt)}. Your doctor will complete the visit.` : "The call window has closed.";
  }

  return (
    <div className={`mt-3 flex flex-col sm:flex-row sm:items-center gap-3 rounded-[16px] border px-4 py-3 text-left ${tone}`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="mt-0.5 shrink-0 flex items-center">{icon}</span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold">{title}</p>
          <p className="text-[13px] opacity-80">{detail}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
