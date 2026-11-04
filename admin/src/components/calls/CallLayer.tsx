"use client";

/*
 * In-app voice and video calls (the same file lives in the patient app and the doctor panel).
 * The server rings the other side over the socket; this shows the incoming-call screen, the
 * "calling…" screen and the call itself, and keeps them in step through `call_update` events.
 */

import { RiCloseLine, RiExternalLinkLine, RiPhoneFill, RiPhoneLine, RiVideoOnFill, RiVideoOnLine } from "@remixicon/react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import axiosInstance from "@/utils/axiosInstance";
import { getSocket } from "@/utils/socket";

export type Side = "doctor" | "patient";
export type CallKind = "voice" | "video";
type Person = { _id: string; name: string; image?: string };
export type Call = {
  _id: string;
  kind: CallKind;
  status: "ringing" | "active" | "ended" | "declined" | "missed" | "cancelled";
  startedBy: Side;
  appointmentId?: string;
  doctor: Person;
  patient: Person;
  ringUntil: string;
  answeredAt?: string;
};
type Join = { provider: "daily" | "jitsi"; url: string; embed: boolean };

type CallsContextType = {
  call: Call | null;
  /** start a call to the other side (patient id for doctors, doctor id for patients) */
  startCall: (to: string, kind: CallKind, appointmentId?: string) => Promise<void>;
  busy: boolean;
};

const CallsContext = createContext<CallsContextType>({ call: null, startCall: async () => {}, busy: false });
export const useCalls = () => useContext(CallsContext);

/**
 * `apiBase` is "/api/doctor/calls" or "/api/user/calls". `sidePanel` is shown next to a live
 * call (the doctor's assistant).
 */
export function CallProvider({
  side,
  apiBase,
  children,
  sidePanel,
}: {
  side: Side;
  apiBase: string;
  children: ReactNode;
  sidePanel?: (call: Call) => ReactNode;
}) {
  const [call, setCall] = useState<Call | null>(null);
  const [join, setJoin] = useState<Join | null>(null);
  const [busy, setBusy] = useState(false);
  const callRef = useRef<Call | null>(null);
  callRef.current = call;

  const finish = useCallback((c: Call) => {
    const mine = c.startedBy === side;
    const other = side === "doctor" ? c.patient.name : c.doctor.name;
    const note: Partial<Record<Call["status"], string>> = {
      declined: mine ? `${other} can't take the call right now` : "",
      missed: mine ? `${other} didn't answer` : `You missed a call from ${other}`,
      cancelled: mine ? "" : `${other} hung up`,
      ended: "Call ended",
    };
    const text = note[c.status];
    if (text) toast.message(text);
    setCall(null);
    setJoin(null);
  }, [side]);

  // pick up a call that's ringing or live (after a refresh, or opening the app from a push)
  useEffect(() => {
    axiosInstance
      .get(`${apiBase}/current`, { silent: true } as any)
      .then(({ data }) => {
        if (data.success && data.call) {
          setCall(data.call);
          setJoin(data.join);
        }
      })
      .catch(() => undefined);
  }, [apiBase]);

  useEffect(() => {
    const socket = getSocket();
    const onIncoming = (c: Call) => {
      if (callRef.current && callRef.current._id !== c._id) return; // already on a call here
      setCall(c);
      setJoin(null);
    };
    const onUpdate = (c: Call) => {
      if (callRef.current?._id !== c._id) return;
      if (c.status === "ringing" || c.status === "active") setCall(c);
      else finish(c);
    };
    socket.on("call_incoming", onIncoming);
    socket.on("call_update", onUpdate);
    return () => {
      socket.off("call_incoming", onIncoming);
      socket.off("call_update", onUpdate);
    };
  }, [finish]);

  const startCall = useCallback(
    async (to: string, kind: CallKind, appointmentId?: string) => {
      if (callRef.current) return void toast.error("You're already in a call");
      setBusy(true);
      try {
        const { data } = await axiosInstance.post(apiBase, { to, kind, appointmentId });
        if (data.success) {
          setCall(data.call);
          setJoin(data.join);
        } else toast.error(data.message);
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message);
      } finally {
        setBusy(false);
      }
    },
    [apiBase],
  );

  const accept = async () => {
    if (!call) return;
    try {
      const { data } = await axiosInstance.post(`${apiBase}/${call._id}/accept`);
      if (data.success) {
        setCall(data.call);
        setJoin(data.join);
        // without Daily the call opens in a new tab; this click lets the browser open it
        if (!data.join.embed) window.open(data.join.url, "_blank", "noopener");
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
      setCall(null);
    }
  };

  const hangUp = async () => {
    if (!call) return;
    const id = call._id;
    setCall(null);
    setJoin(null);
    try {
      await axiosInstance.post(`${apiBase}/${id}/end`, {}, { silent: true } as any);
    } catch {
      // the server closes it anyway when the ring time passes
    }
  };

  const value = useMemo(() => ({ call, startCall, busy }), [call, startCall, busy]);

  return (
    <CallsContext.Provider value={value}>
      {children}
      {call && <CallScreen side={side} call={call} join={join} onAccept={accept} onHangUp={hangUp} sidePanel={sidePanel} />}
    </CallsContext.Provider>
  );
}

/** Ring, ringback or live call, on top of everything. */
function CallScreen({
  side,
  call,
  join,
  onAccept,
  onHangUp,
  sidePanel,
}: {
  side: Side;
  call: Call;
  join: Join | null;
  onAccept: () => void;
  onHangUp: () => void;
  sidePanel?: (call: Call) => ReactNode;
}) {
  const other = side === "doctor" ? call.patient : call.doctor;
  const incoming = call.status === "ringing" && call.startedBy !== side;
  const outgoing = call.status === "ringing" && call.startedBy === side;
  const live = call.status === "active";
  const [panelOpen, setPanelOpen] = useState(true);
  useRingtone(incoming ? "ring" : outgoing ? "ringback" : null);
  const elapsed = useElapsed(live ? call.answeredAt : undefined);
  const kindLabel = call.kind === "video" ? "video call" : "voice call";

  // live + embedded: the call fills the screen, with the assistant beside it for doctors
  if (live && join?.embed) {
    return createPortal(
      <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 text-white">
          <Face person={other} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="font-black truncate">{other.name}</p>
            <p className="text-[12px] text-teal-300 tabular-nums">
              {call.kind === "video" ? "Video" : "Voice"} · {elapsed}
            </p>
          </div>
          {sidePanel && (
            <button onClick={() => setPanelOpen((o) => !o)} className="hidden md:block px-3 py-2 rounded-xl bg-white/10 text-[12px] font-bold hover:bg-white/20">
              {panelOpen ? "Hide assistant" : "Show assistant"}
            </button>
          )}
          <button onClick={onHangUp} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-sm font-black hover:bg-rose-700">
            <RiPhoneFill size={16} className="rotate-[135deg]" /> End
          </button>
        </div>
        <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 pt-0 min-h-0">
          <iframe
            title={`Call with ${other.name}`}
            src={join.url}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="flex-1 min-h-[50vh] rounded-2xl bg-slate-900 border border-white/10"
          />
          {sidePanel && panelOpen && <aside className="md:w-[380px] md:shrink-0 max-h-[45vh] md:max-h-none overflow-y-auto rounded-2xl bg-white">{sidePanel(call)}</aside>}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-label={`${kindLabel} with ${other.name}`} className="w-full max-w-sm rounded-[32px] bg-slate-900 text-white p-8 text-center shadow-2xl">
        <div className="relative w-28 h-28 mx-auto">
          {(incoming || outgoing) && <span className="absolute inset-0 rounded-full bg-teal-400/30 animate-ping" />}
          <Face person={other} size="lg" />
        </div>
        <p className="text-2xl font-black mt-6">{other.name}</p>
        <p className="text-sm text-slate-300 mt-1 flex items-center justify-center gap-1.5">
          {call.kind === "video" ? <RiVideoOnLine size={16} /> : <RiPhoneLine size={16} />}
          {incoming ? `Incoming ${kindLabel}` : outgoing ? "Ringing…" : live ? `On a ${kindLabel} · ${elapsed}` : ""}
        </p>

        {live && join && !join.embed && (
          <div className="mt-6 rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
            The call is open in another tab.
            <a href={join.url} target="_blank" rel="noopener" className="mt-3 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 font-bold text-white hover:bg-white/20">
              <RiExternalLinkLine size={16} /> Open the call
            </a>
          </div>
        )}
        {outgoing && join && !join.embed && (
          <a href={join.url} target="_blank" rel="noopener" className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-teal-300 hover:text-teal-200">
            <RiExternalLinkLine size={14} /> Open the call room now
          </a>
        )}

        <div className="flex justify-center gap-10 mt-8">
          {incoming ? (
            <>
              <RoundButton label="Decline" tone="bg-rose-600 hover:bg-rose-700" onClick={onHangUp}>
                <RiPhoneFill size={26} className="rotate-[135deg]" />
              </RoundButton>
              {/* the icon wiggles, the button stays put so it's easy to hit */}
              <RoundButton label="Accept" tone="bg-emerald-500 hover:bg-emerald-600" onClick={onAccept}>
                <span className="animate-bounce">{call.kind === "video" ? <RiVideoOnFill size={26} /> : <RiPhoneFill size={26} />}</span>
              </RoundButton>
            </>
          ) : (
            <RoundButton label={outgoing ? "Cancel" : "End"} tone="bg-rose-600 hover:bg-rose-700" onClick={onHangUp}>
              {outgoing ? <RiCloseLine size={28} /> : <RiPhoneFill size={26} className="rotate-[135deg]" />}
            </RoundButton>
          )}
        </div>
        {live && sidePanel && join && !join.embed && <div className="mt-6 text-left rounded-2xl bg-white text-slate-900 max-h-[40vh] overflow-y-auto">{sidePanel(call)}</div>}
      </div>
    </div>,
    document.body,
  );
}

function RoundButton({ label, tone, onClick, children }: { label: string; tone: string; onClick: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={onClick} aria-label={label} className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-colors ${tone}`}>
        {children}
      </button>
      <span className="text-[12px] font-bold text-slate-300">{label}</span>
    </div>
  );
}

function Face({ person, size }: { person: Person; size: "sm" | "lg" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "lg" ? "w-28 h-28 text-3xl" : "w-10 h-10 text-sm";
  const initials = person.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return person.image && !broken ? (
    <img src={person.image} alt="" onError={() => setBroken(true)} className={`relative ${box} rounded-full object-cover object-top bg-slate-800 border-2 border-white/10`} />
  ) : (
    <div className={`relative ${box} rounded-full bg-teal-600 font-black flex items-center justify-center`}>{initials || "?"}</div>
  );
}

/** "02:15" since the call was answered. */
function useElapsed(since?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  if (!since) return "";
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm.slice(-2)}:${ss}` : `${mm}:${ss}`;
}

/**
 * A ring (incoming) or ringback (outgoing) tone made with the browser's audio, plus a buzz on
 * phones. Browsers may keep it silent until the person has clicked somewhere on the page.
 */
function useRingtone(mode: "ring" | "ringback" | null) {
  useEffect(() => {
    if (!mode) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return;
    }
    const beep = (at: number, freq: number, length: number) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(at);
      osc.stop(at + length + 0.05);
    };
    const pattern = () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      if (mode === "ring") {
        beep(t, 880, 0.35);
        beep(t + 0.45, 880, 0.35);
        navigator.vibrate?.([400, 200, 400]);
      } else {
        beep(t, 440, 1.2);
      }
    };
    pattern();
    const timer = setInterval(pattern, mode === "ring" ? 2000 : 3000);
    return () => {
      clearInterval(timer);
      navigator.vibrate?.(0);
      ctx?.close().catch(() => undefined);
    };
  }, [mode]);
}

/** Voice + video buttons for a person, used in chat headers and visit cards. */
export function CallButtons({ to, appointmentId, compact }: { to: string; appointmentId?: string; compact?: boolean }) {
  const { startCall, busy, call } = useCalls();
  const disabled = busy || !!call;
  const cls = compact
    ? "w-9 h-9 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 disabled:opacity-40"
    : "flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 disabled:opacity-40";
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => startCall(to, "voice", appointmentId)} disabled={disabled} className={cls} aria-label="Voice call" title="Voice call">
        <RiPhoneLine size={16} /> {!compact && "Call"}
      </button>
      <button onClick={() => startCall(to, "video", appointmentId)} disabled={disabled} className={cls} aria-label="Video call" title="Video call">
        <RiVideoOnLine size={16} /> {!compact && "Video"}
      </button>
    </div>
  );
}
