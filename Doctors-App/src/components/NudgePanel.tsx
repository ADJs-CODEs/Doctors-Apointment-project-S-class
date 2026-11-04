"use client";

import { RiNotification3Line, RiSendPlane2Line } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

type Nudge = { _id: string; kind: string; text: string; fromName: string; mine: boolean; createdAt: string };

// what a caregiver usually wants to say, and what the patient usually answers
const CAREGIVER = ["love", "medicine", "checkin", "water", "rest", "call"];
const PATIENT = ["okay", "thanks", "love", "call"];
const LABELS: Record<string, string> = {
  love: "❤️ Thinking of you",
  medicine: "💊 Medicine?",
  checkin: "🙂 How are you?",
  water: "💧 Drink water",
  rest: "🛌 Rest",
  call: "📞 Call me",
  okay: "✅ I'm okay",
  thanks: "🙏 Thank you",
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
    <div className={compact ? "" : "bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm"}>
      <p className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-3">
        <RiNotification3Line size={13} /> Send {first} a nudge · reaches their phone
      </p>
      <div className="flex flex-wrap gap-2">
        {(as === "caregiver" ? CAREGIVER : PATIENT).map((k) => (
          <button
            key={k}
            onClick={() => send(k)}
            disabled={!!sending}
            className={`px-3 py-2 rounded-xl border text-[12px] font-bold transition-colors disabled:opacity-50 ${
              sending === k ? "bg-teal-600 text-white border-teal-600" : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-teal-50 hover:border-teal-200"
            }`}
          >
            {LABELS[k]}
          </button>
        ))}
        {!writing && (
          <button onClick={() => setWriting(true)} className="px-3 py-2 rounded-xl border border-dashed border-slate-300 text-[12px] font-bold text-slate-500 hover:bg-slate-50">
            ✍️ Write your own
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
            className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
          />
          <button type="submit" disabled={!custom.trim() || !!sending} className="px-4 rounded-xl bg-teal-600 text-white disabled:opacity-40" aria-label="Send">
            <RiSendPlane2Line size={16} />
          </button>
        </form>
      )}

      {!compact && history.length > 0 && (
        <ul className="mt-4 pt-4 border-t border-slate-50 space-y-2">
          {history.slice(0, 5).map((n) => (
            <li key={n._id} className={`flex ${n.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${n.mine ? "bg-teal-50 text-teal-900" : "bg-slate-100 text-slate-800"}`}>
                <p className="text-[13px]">{n.text}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
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
