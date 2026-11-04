"use client";

import {
  RiNotification3Line,
  RiSendPlane2Line,
  RiHeart3Line,
  RiCapsuleLine,
  RiChatSmile2Line,
  RiDropLine,
  RiHotelBedLine,
  RiPhoneLine,
  RiCheckboxCircleLine,
  RiHandHeartLine,
  RiQuillPenLine,
} from "@remixicon/react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

type Nudge = { _id: string; kind: string; text: string; fromName: string; mine: boolean; createdAt: string };

// what a caregiver usually wants to say, and what the patient usually answers
const CAREGIVER = ["love", "medicine", "checkin", "water", "rest", "call"];
const PATIENT = ["okay", "thanks", "love", "call"];
const LABELS: Record<string, { text: string; icon: ReactNode }> = {
  love: { text: "Thinking of you", icon: <RiHeart3Line size={15} className="text-rose-500" /> },
  medicine: { text: "Medicine?", icon: <RiCapsuleLine size={15} className="text-brand-ink" /> },
  checkin: { text: "How are you?", icon: <RiChatSmile2Line size={15} className="text-amber-600" /> },
  water: { text: "Drink water", icon: <RiDropLine size={15} className="text-[#3554C4]" /> },
  rest: { text: "Rest", icon: <RiHotelBedLine size={15} className="text-video" /> },
  call: { text: "Call me", icon: <RiPhoneLine size={15} className="text-brand-ink" /> },
  okay: { text: "I'm okay", icon: <RiCheckboxCircleLine size={15} className="text-brand-ink" /> },
  thanks: { text: "Thank you", icon: <RiHandHeartLine size={15} className="text-rose-500" /> },
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/**
 * Send a short notification to someone in the care circle. It reaches their bell and their
 * phone even when the app is closed (phone alerts follow their "Care circle" setting).
 */
export default function NudgePanel({ toUserId, name, as, compact }: { toUserId: string; name: string; as: "caregiver" | "patient"; compact?: boolean }) {
  const [history, setHistory] = useState<Nudge[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [writing, setWriting] = useState(false);
  const first = name.split(" ")[0];

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.CONNECTIONS.NUDGES(toUserId), { silent: true } as any);
      if (data.success) setHistory(data.nudges);
    } catch {
      // history is a nice-to-have
    }
  }, [toUserId]);

  useEffect(() => {
    if (!compact) load();
  }, [load, compact]);

  const send = async (kind: string, text?: string) => {
    setSending(kind);
    try {
      const { data } = await axiosInstance.post(API_PATHS.CONNECTIONS.NUDGE, { toUserId, kind, text });
      if (data.success) {
        toast.success(`Sent to ${first}`);
        setCustom("");
        setWriting(false);
        if (!compact) load();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSending(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (custom.trim()) send("custom", custom);
  };

  return (
    <div className={compact ? "" : "surface rounded-[22px] p-5"}>
      <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink mb-1">
        <RiNotification3Line size={16} className="text-brand-ink" /> Send {first} a nudge
      </p>
      <p className="text-[13px] text-ink-3 mb-3">It reaches their phone, even with the app closed.</p>
      <div className="flex flex-wrap gap-2">
        {(as === "caregiver" ? CAREGIVER : PATIENT).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => send(k)}
            disabled={!!sending}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] border text-[14px] font-semibold transition-colors disabled:opacity-50 ${
              sending === k ? "btn-teal" : "bg-white border-line text-ink hover:border-brand hover:bg-brand-soft/40"
            }`}
          >
            {LABELS[k].icon}
            {LABELS[k].text}
          </button>
        ))}
        {!writing && (
          <button
            type="button"
            onClick={() => setWriting(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] border border-dashed border-line text-[14px] font-semibold text-ink-2 hover:bg-white"
          >
            <RiQuillPenLine size={15} /> Write your own
          </button>
        )}
      </div>

      {writing && (
        <form onSubmit={submit} className="flex gap-2 mt-3">
          <input
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            maxLength={160}
            placeholder={`A short note to ${first}`}
            className="field flex-1 min-w-0 !py-2.5"
          />
          <button type="submit" disabled={!custom.trim() || !!sending} className="btn btn-teal !px-4 !rounded-[14px]" aria-label="Send">
            <RiSendPlane2Line size={16} />
          </button>
        </form>
      )}

      {!compact && history.length > 0 && (
        <ul className="mt-4 pt-4 border-t border-line space-y-2">
          {history.slice(0, 5).map((n) => (
            <li key={n._id} className={`flex ${n.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-[16px] px-3 py-2 ${n.mine ? "bg-brand-soft text-[#08504F]" : "bg-white border border-line text-ink"}`}>
                <p className="text-[14px]">{n.text}</p>
                <p className="text-[12px] text-ink-3 mt-0.5">
                  {n.mine ? "You" : n.fromName} · {ago(n.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
