"use client";

import {
  RiAlarmWarningLine,
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiAttachment2,
  RiCalendarCheckLine,
  RiCapsuleLine,
  RiChat3Line,
  RiCloseLine,
  RiErrorWarningFill,
  RiHeartPulseLine,
  RiInformationLine,
  RiSearchLine,
  RiSendPlane2Fill,
  RiUser3Line,
  RiVideoOnLine,
} from "@remixicon/react";
import { type FormEvent, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import JoinCallButton, { callState } from "@/components/JoinCallButton";
import { useDoctorMessages } from "@/context/DoctorMessagesContext";
import { useNavigate, useSearchParams } from "@/lib/navigation";
import type { ChatMessage, MedicineSummary, PatientThread, PatientVisit } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { getSocket } from "@/utils/socket";

type About = { appointmentId?: string; medicineName?: string };
type Filter = "all" | "unread" | "critical";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "27_3_2026" -> "27 Mar 2026" */
const visitDate = (slotDate: string) => {
  const [d, m, y] = slotDate.split("_");
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
};

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

const dayOf = (iso: string) => {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const listTime = (iso: string) => {
  const d = new Date(iso);
  if (dayOf(iso) === "Today") return timeOf(iso);
  if ((Date.now() - d.getTime()) / 86_400_000 < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const ageFrom = (dob: string) => {
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const age = Math.floor((Date.now() - born.getTime()) / (365.25 * 86_400_000));
  return age > 0 && age < 130 ? age : null;
};

const MED_STATUS: Record<MedicineSummary["status"], { label: string; tone: string }> = {
  missed: { label: "Missed", tone: "bg-red-100 text-red-700" },
  due: { label: "Due now", tone: "bg-orange-100 text-orange-700" },
  "on-track": { label: "On track", tone: "bg-teal-50 text-teal-700" },
  "not-started": { label: "Not started", tone: "bg-slate-100 text-slate-600" },
  stopped: { label: "Stopped", tone: "bg-slate-100 text-slate-500" },
  finished: { label: "Finished", tone: "bg-slate-100 text-slate-500" },
};

function aboutLabel(about: About, visits: PatientVisit[]) {
  const visit = visits.find((v) => v._id === about.appointmentId);
  if (!visit) return null;
  return about.medicineName
    ? `${about.medicineName} · visit ${visitDate(visit.slotDate)}`
    : `Visit on ${visitDate(visit.slotDate)}`;
}

export default function DoctorMessages() {
  const [params] = useSearchParams();
  const patientId = params.get("patient");
  const navigate = useNavigate();
  const { conversations, loaded, refresh, subscribe, setOpenPatient } = useDoctorMessages();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [thread, setThread] = useState<PatientThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [sending, setSending] = useState(false);
  const [about, setAbout] = useState<About>({});
  const [pickingAbout, setPickingAbout] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [focusVisit, setFocusVisit] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setAbout({ appointmentId: params.get("appointment") ?? undefined });
  }, [params]);

  const loadThread = useCallback(async () => {
    if (!patientId) return;
    setLoadingThread(true);
    try {
      const { data } = await axiosInstance.get(API_PATHS.MESSAGES.THREAD(patientId));
      if (data.success) {
        setThread({ patient: data.patient, critical: data.critical, visits: data.visits, messages: data.messages });
        refresh();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Couldn't open this conversation");
      setThread(null);
    } finally {
      setLoadingThread(false);
    }
  }, [patientId, refresh]);

  // (re)load only when a different patient is opened
  useEffect(() => {
    setThread(null);
    setUrgent(false);
    setFocusVisit(null);
    loadThread();
    setOpenPatient(patientId);
    return () => setOpenPatient(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(
    () =>
      subscribe((message) => {
        if (message.userId !== patientId) return;
        setThread((t) =>
          t && !t.messages.some((m) => m._id === message._id) ? { ...t, messages: [...t.messages, message] } : t,
        );
        if (message.sender === "patient" && patientId) {
          axiosInstance
            .post(API_PATHS.MESSAGES.READ(patientId), {}, { silent: true } as any)
            .then(() => refresh())
            .catch(() => {});
        }
      }),
    [subscribe, patientId, refresh],
  );

  // the patient read our messages
  useEffect(() => {
    const socket = getSocket();
    const onRead = (e: { userId: string; readBy: string }) => {
      if (e.readBy !== "patient" || e.userId !== patientId) return;
      const now = new Date().toISOString();
      setThread((t) =>
        t && {
          ...t,
          messages: t.messages.map((m) => (m.sender === "doctor" && !m.readAt ? { ...m, readAt: now } : m)),
        },
      );
    };
    socket.on("chat_read", onRead);
    return () => {
      socket.off("chat_read", onRead);
    };
  }, [patientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  const activeVisits = useMemo(() => (thread?.visits ?? []).filter((v) => v.status !== "cancelled"), [thread]);

  const toggleUrgent = () => {
    // an urgent message marks a visit Critical, so it needs one: default to the latest
    if (!urgent && !about.appointmentId) {
      const latest = activeVisits.find((v) => v.status === "completed") ?? activeVisits[0];
      if (latest) setAbout({ appointmentId: latest._id });
    }
    setUrgent((u) => !u);
  };

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !patientId || sending) return;
    setSending(true);
    try {
      const { data } = await axiosInstance.post(
        API_PATHS.MESSAGES.THREAD(patientId),
        { text: body, urgent, ...about },
        { silent: true } as any,
      );
      if (data.success) {
        setText("");
        if (urgent) {
          setUrgent(false);
          loadThread(); // the visit is Critical now
        }
        setThread((t) =>
          t && !t.messages.some((m) => m._id === data.message._id)
            ? { ...t, messages: [...t.messages, data.message] }
            : t,
        );
        refresh();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Message not sent");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const shown = conversations.filter((c) => {
    if (filter === "unread" && !c.unread) return false;
    if (filter === "critical" && !c.critical) return false;
    return !search || c.patient.name.toLowerCase().includes(search.toLowerCase());
  });

  const rows = useMemo(() => {
    const out: ({ kind: "day"; label: string } | { kind: "msg"; m: ChatMessage })[] = [];
    let lastDay = "";
    for (const m of thread?.messages ?? []) {
      const day = dayOf(m.createdAt);
      if (day !== lastDay) out.push({ kind: "day", label: day });
      lastDay = day;
      out.push({ kind: "msg", m });
    }
    return out;
  }, [thread?.messages]);
  const lastOwnId = [...(thread?.messages ?? [])].reverse().find((m) => m.sender === "doctor")?._id;
  const currentAbout = thread ? aboutLabel(about, thread.visits) : null;

  // soonest upcoming video call with this patient (visits come newest first)
  const nextVideoCall =
    [...(thread?.visits ?? [])]
      .reverse()
      .find((v) => v.kind === "video" && v.status === "upcoming" && callState(v.slotDate, v.slotTime).state !== "ended") ?? null;

  const openVisitInPanel = (visitId: string) => {
    setFocusVisit(visitId);
    setShowPanel(true);
  };

  return (
    <div className="p-0 sm:p-2 lg:p-8">
      <div className="mb-5 hidden lg:block">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Messages</h1>
        <p className="text-slate-500 mt-1">Every message shows which visit or medicine it&apos;s about.</p>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-200 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)] overflow-hidden flex h-[calc(100dvh-11rem)] lg:h-[calc(100dvh-12rem)] min-h-[480px]">
        {/* --- patients (tinted, so it reads as its own column) --- */}
        <aside
          className={`${patientId ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 flex-col bg-slate-100/70 border-r border-slate-200`}
        >
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2">
              <RiSearchLine size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients"
                className="bg-transparent outline-none text-sm flex-1 min-w-0"
              />
            </div>
            <div className="flex gap-1.5">
              {(["all", "unread", "critical"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                    filter === f
                      ? f === "critical"
                        ? "bg-red-600 text-white"
                        : "bg-slate-900 text-white"
                      : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {!loaded ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : shown.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                {conversations.length ? "No patients match." : "Patients who book with you will appear here."}
              </p>
            ) : (
              shown.map((c) => {
                const active = c.patient._id === patientId;
                return (
                  <button
                    key={c.patient._id}
                    onClick={() => navigate(`/doctor-messages?patient=${c.patient._id}`, { replace: !!patientId })}
                    className={`relative w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all ${
                      active
                        ? "bg-white shadow-sm ring-1 ring-slate-200 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-full before:bg-teal-500"
                        : c.unread
                          ? "bg-white/80 hover:bg-white"
                          : "hover:bg-white/70"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img src={c.patient.image} alt="" className="w-11 h-11 rounded-2xl object-cover bg-slate-100" />
                      {c.critical && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-600 border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`truncate ${c.unread ? "font-black text-slate-900" : "font-bold text-slate-800"}`}>
                          {c.patient.name}
                        </p>
                        {c.lastMessage && (
                          <span className={`text-[11px] shrink-0 ${c.unread ? "text-teal-600 font-bold" : "text-slate-400"}`}>
                            {listTime(c.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-[13px] truncate ${c.unread ? "text-slate-700" : "text-slate-400"}`}>
                          {c.lastMessage
                            ? `${c.lastMessage.sender === "doctor" ? "You: " : ""}${c.lastMessage.text}`
                            : c.critical
                              ? "Critical · no messages yet"
                              : "No messages yet"}
                        </p>
                        {c.unread > 0 && (
                          <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-teal-500 text-[11px] font-black text-white flex items-center justify-center">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* --- thread --- */}
        <section className={`${patientId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}>
          {!patientId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.07),transparent_60%)]">
              <div className="w-16 h-16 rounded-2xl bg-white text-teal-600 border border-teal-100 shadow-md flex items-center justify-center mb-4">
                <RiChat3Line size={26} />
              </div>
              <p className="font-black text-slate-900">Pick a patient</p>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                Their visits, vitals and medicines open next to the conversation.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
                <button
                  onClick={() => navigate("/doctor-messages")}
                  className="md:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100"
                  aria-label="Back to patients"
                >
                  <RiArrowLeftLine size={20} />
                </button>
                {thread?.patient ? (
                  <>
                    <img src={thread.patient.image} alt="" className="w-10 h-10 rounded-xl object-cover bg-slate-100" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900 truncate">{thread.patient.name}</p>
                        {thread.critical && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full">
                            Critical
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-400 truncate">
                        {activeVisits.length} visit{activeVisits.length === 1 ? "" : "s"} with you
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPanel((s) => !s)}
                      className={`xl:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold ${
                        showPanel ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <RiUser3Line size={15} /> Patient
                    </button>
                  </>
                ) : (
                  <div className="h-10 w-48 rounded-xl bg-slate-100 animate-pulse" />
                )}
              </div>

              {/* the next video call with this patient, if there is one */}
              {nextVideoCall && (
                <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 bg-violet-50 border-b border-violet-100">
                  <p className="flex items-center gap-2 text-[13px] text-violet-900 min-w-0">
                    <RiVideoOnLine size={16} className="text-violet-600 shrink-0" />
                    <span className="truncate">
                      <span className="font-bold">Video call</span> · {visitDate(nextVideoCall.slotDate)}, {nextVideoCall.slotTime}
                    </span>
                  </p>
                  <JoinCallButton appointment={nextVideoCall} className="shrink-0" />
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 bg-slate-50">
                {loadingThread && !thread ? (
                  <div className="space-y-3">
                    {[60, 40, 70].map((w, i) => (
                      <div
                        key={i}
                        className={`h-12 rounded-2xl bg-slate-200/70 animate-pulse ${i % 2 ? "ml-auto" : ""}`}
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                ) : thread && thread.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <p className="font-bold text-slate-700">No messages yet</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">
                      Attach a visit or medicine so the patient knows what you mean.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rows.map((row, i) =>
                      row.kind === "day" ? (
                        <div key={`day-${i}`} className="flex justify-center py-2">
                          <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-100 rounded-full px-3 py-1">
                            {row.label}
                          </span>
                        </div>
                      ) : (
                        <Bubble
                          key={row.m._id}
                          m={row.m}
                          topic={aboutLabel(
                            { appointmentId: row.m.appointmentId, medicineName: row.m.medicineName },
                            thread?.visits ?? [],
                          )}
                          onTopic={row.m.appointmentId ? () => openVisitInPanel(row.m.appointmentId!) : undefined}
                          showRead={row.m._id === lastOwnId}
                        />
                      ),
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <form
                onSubmit={send}
                className={`border-t px-3 sm:px-4 py-3 ${urgent ? "bg-red-50 border-red-200" : "bg-white border-slate-100"}`}
              >
                <div className="flex items-center gap-x-3 gap-y-2 mb-2 flex-wrap">
                  {currentAbout ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-teal-700 bg-teal-50 rounded-full pl-3 pr-1.5 py-1">
                      {about.medicineName ? <RiCapsuleLine size={13} /> : <RiCalendarCheckLine size={13} />}
                      About: {currentAbout}
                      <button
                        type="button"
                        onClick={() => setAbout({})}
                        className="p-0.5 rounded-full hover:bg-teal-100"
                        aria-label="Remove topic"
                      >
                        <RiCloseLine size={14} />
                      </button>
                    </span>
                  ) : (
                    <span className="text-[12px] text-slate-400">General message</span>
                  )}
                  {activeVisits.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPickingAbout((v) => !v)}
                        aria-expanded={pickingAbout}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold transition-colors ${
                          pickingAbout
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-400 hover:bg-teal-100"
                        }`}
                      >
                        <RiAttachment2 size={14} />
                        {currentAbout ? "Change topic" : "Add a visit or medicine"}
                        <RiArrowDownSLine size={15} className={`transition-transform ${pickingAbout ? "rotate-180" : ""}`} />
                      </button>
                      <InfoTip>
                        Attach the visit or medicine you&apos;re writing about. The patient sees it on the
                        message (e.g. <span className="font-bold">“Re: Paracetamol · visit 27 Mar”</span>). You can
                        also pick one from the patient panel with “Reference in message”.
                      </InfoTip>
                      {pickingAbout && (
                        <TopicPicker
                          visits={activeVisits}
                          onPick={(a) => {
                            setAbout(a);
                            setPickingAbout(false);
                            inputRef.current?.focus();
                          }}
                          onClose={() => setPickingAbout(false)}
                        />
                      )}
                    </div>
                  )}
                  <label
                    className={`ml-auto inline-flex items-center gap-1.5 text-[12px] font-bold cursor-pointer select-none ${
                      urgent ? "text-red-600" : "text-slate-500 hover:text-red-600"
                    }`}
                    title="Shows in red, marks the visit Critical and emails the patient"
                  >
                    <input type="checkbox" checked={urgent} onChange={toggleUrgent} className="accent-red-600" />
                    <RiAlarmWarningLine size={14} /> Urgent
                  </label>
                </div>
                {urgent && (
                  <p className="text-[12px] text-red-700 mb-2">
                    The patient gets a red alert and an email, and this visit is marked Critical.
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    maxLength={4000}
                    placeholder={urgent ? "Write an urgent message…" : "Write a message…"}
                    className={`flex-1 resize-none max-h-36 min-h-[46px] rounded-2xl border px-4 py-3 text-sm outline-none bg-white ${
                      urgent
                        ? "border-red-300 focus:ring-2 focus:ring-red-100"
                        : "border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className={`h-[46px] w-[46px] shrink-0 rounded-2xl text-white flex items-center justify-center disabled:opacity-40 transition-colors ${
                      urgent ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-teal-600"
                    }`}
                    aria-label="Send"
                  >
                    {sending ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RiSendPlane2Fill size={18} />
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>

        {/* --- patient panel: always on wide screens, a slide-over otherwise --- */}
        {patientId && thread && (
          <>
            {showPanel && (
              <div className="xl:hidden fixed inset-0 z-40 bg-slate-900/30" onClick={() => setShowPanel(false)} />
            )}
            <PatientPanel
              thread={thread}
              focusVisit={focusVisit}
              open={showPanel}
              onClose={() => setShowPanel(false)}
              onReference={(a) => {
                setAbout(a);
                setShowPanel(false);
                inputRef.current?.focus();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Bubble({
  m,
  topic,
  onTopic,
  showRead,
}: {
  m: ChatMessage;
  topic: string | null;
  onTopic?: () => void;
  showRead: boolean;
}) {
  const mine = m.sender === "doctor";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] sm:max-w-[70%]">
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            mine
              ? m.urgent
                ? "bg-red-600 text-white rounded-br-md"
                : "bg-slate-900 text-white rounded-br-md"
              : "bg-white text-slate-800 border border-slate-100 rounded-bl-md"
          }`}
        >
          {m.urgent && (
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-100 mb-1">
              <RiErrorWarningFill size={13} /> Urgent
            </p>
          )}
          {topic && (
            <button
              type="button"
              onClick={onTopic}
              className={`block text-left text-[11px] font-bold mb-1 underline-offset-2 hover:underline ${
                mine ? (m.urgent ? "text-red-100" : "text-teal-300") : "text-teal-600"
              }`}
            >
              Re: {topic}
            </button>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
        </div>
        <p className={`text-[10px] text-slate-400 mt-1 px-1 ${mine ? "text-right" : ""}`}>
          {timeOf(m.createdAt)}
          {mine && showRead && m.readAt ? " · Read" : ""}
        </p>
      </div>
    </div>
  );
}

/** A small ⓘ that explains something on hover, focus or tap. */
function InfoTip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="How topics work"
        className="p-0.5 rounded-full text-slate-400 hover:text-teal-600"
      >
        <RiInformationLine size={15} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-64 rounded-xl bg-slate-900 text-white text-[12px] leading-relaxed px-3 py-2.5 shadow-xl"
        >
          {children}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
}

function TopicPicker({
  visits,
  onPick,
  onClose,
}: {
  visits: PatientVisit[];
  onPick: (about: About) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 z-20 w-72 max-h-72 overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-xl p-2">
        <p className="px-3 pt-1 pb-2 text-[11px] text-slate-400 leading-snug">
          What is this message about? The patient will see it on the message.
        </p>
        <button
          type="button"
          onClick={() => onPick({})}
          className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          General message
        </button>
        {visits.map((v) => (
          <div key={v._id} className="mt-1">
            <button
              type="button"
              onClick={() => onPick({ appointmentId: v._id })}
              className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              <RiCalendarCheckLine size={15} className="text-teal-600" />
              Visit on {visitDate(v.slotDate)}
              {v.status === "upcoming" && <span className="text-[10px] font-bold text-slate-400 ml-auto">Upcoming</span>}
            </button>
            {v.medicines.map((med) => (
              <button
                key={med.name}
                type="button"
                onClick={() => onPick({ appointmentId: v._id, medicineName: med.name })}
                className="w-full flex items-center gap-2 text-left pl-9 pr-3 py-1.5 rounded-xl text-[13px] text-slate-600 hover:bg-slate-50 capitalize"
              >
                <RiCapsuleLine size={14} className="text-slate-400" />
                {med.name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/** Everything about the patient the doctor needs while replying. */
function PatientPanel({
  thread,
  focusVisit,
  open,
  onClose,
  onReference,
}: {
  thread: PatientThread;
  focusVisit: string | null;
  open: boolean;
  onClose: () => void;
  onReference: (about: About) => void;
}) {
  const visitRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { patient, visits } = thread;
  const age = patient ? ageFrom(patient.dob) : null;
  const latestVitals = visits.find(
    (v) => v.status === "completed" && (v.vitals.heartRate || v.vitals.bloodPressure || v.vitals.temperature),
  );
  const attention = visits.flatMap((v) =>
    v.status === "cancelled"
      ? []
      : v.medicines
          .filter((m) => m.status === "missed" || m.status === "due" || m.overdoseAlert)
          .map((m) => ({ visit: v, med: m })),
  );

  useEffect(() => {
    if (focusVisit) visitRefs.current[focusVisit]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusVisit, open]);

  return (
    <aside
      className={`w-[340px] max-w-[90vw] shrink-0 border-l border-slate-100 bg-white flex-col overflow-y-auto ${
        open ? "flex fixed inset-y-0 right-0 z-50 shadow-2xl" : "hidden"
      } xl:flex xl:static xl:shadow-none xl:z-auto`}
    >
      <div className="flex items-center justify-between px-5 pt-5 xl:hidden">
        <p className="text-[11px] font-black uppercase tracking-[2px] text-slate-400">Patient</p>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close">
          <RiCloseLine size={18} />
        </button>
      </div>

      {patient && (
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src={patient.image} alt="" className="w-14 h-14 rounded-2xl object-cover bg-slate-100" />
            <div className="min-w-0">
              <p className="font-black text-slate-900 truncate">{patient.name}</p>
              <p className="text-[12px] text-slate-500">
                {[patient.gender !== "Not Selected" ? patient.gender : null, age ? `${age} yrs` : null]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-[12px] text-slate-500">
            <p className="truncate">{patient.email}</p>
            {patient.phone && patient.phone !== "0000000000" && <p>{patient.phone}</p>}
          </div>
          {thread.critical && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <RiErrorWarningFill size={15} /> Marked critical
            </p>
          )}
        </div>
      )}

      {attention.length > 0 && (
        <div className="p-5 border-b border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-[2px] text-red-600 mb-3">Needs attention</p>
          <div className="space-y-2">
            {attention.map(({ visit, med }) => (
              <button
                key={`${visit._id}-${med.name}`}
                onClick={() => onReference({ appointmentId: visit._id, medicineName: med.name })}
                className="w-full text-left rounded-xl border border-red-100 bg-red-50/60 px-3 py-2 hover:bg-red-50"
              >
                <p className="text-sm font-bold text-slate-800 capitalize">{med.name}</p>
                <p className="text-[11px] text-red-700">
                  {med.overdoseAlert
                    ? "Took an early dose"
                    : med.status === "missed"
                      ? `${med.missedDoses} dose${med.missedDoses > 1 ? "s" : ""} missed`
                      : "Dose due now"}{" "}
                  · visit {visitDate(visit.slotDate)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {latestVitals && (
        <div className="p-5 border-b border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-3 flex items-center gap-1.5">
            <RiHeartPulseLine size={13} className="text-teal-600" /> Latest vitals · {visitDate(latestVitals.slotDate)}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["HR", latestVitals.vitals.heartRate, "bpm"],
              ["BP", latestVitals.vitals.bloodPressure, ""],
              ["Temp", latestVitals.vitals.temperature, "°C"],
            ].map(([label, value, unit]) => (
              <div key={label} className="rounded-xl bg-slate-50 py-2">
                <p className="text-[10px] font-bold text-slate-400">{label}</p>
                <p className="text-sm font-black text-slate-900">
                  {value || "--"}
                  {value && unit ? <span className="text-[10px] text-slate-400 font-medium"> {unit}</span> : null}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-5">
        <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-3">Visits with you</p>
        <div className="space-y-3">
          {visits.map((v) => (
            <div
              key={v._id}
              ref={(el) => {
                visitRefs.current[v._id] = el;
              }}
              className={`rounded-2xl border p-3 transition-colors ${
                focusVisit === v._id ? "border-teal-300 ring-2 ring-teal-100" : "border-slate-100"
              } ${v.status === "cancelled" ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-800">
                  {visitDate(v.slotDate)} <span className="font-medium text-slate-400">· {v.slotTime}</span>
                </p>
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    v.patientStatus === "Critical" && v.status !== "cancelled"
                      ? "bg-red-600 text-white"
                      : v.status === "completed"
                        ? "bg-teal-50 text-teal-700"
                        : v.status === "upcoming"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {v.patientStatus === "Critical" && v.status !== "cancelled" ? "Critical" : v.status}
                </span>
              </div>
              {v.doctorNotes && <p className="text-[12px] text-slate-500 mt-2 line-clamp-3">{v.doctorNotes}</p>}
              {v.medicines.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {v.medicines.map((m) => (
                    <li key={m.name} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-700 capitalize truncate">{m.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {m.schedule} · {m.adherence}% taken
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${MED_STATUS[m.status].tone}`}
                      >
                        {MED_STATUS[m.status].label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {v.status !== "cancelled" && (
                <button
                  onClick={() => onReference({ appointmentId: v._id })}
                  className="mt-2 text-[11px] font-bold text-teal-600 hover:text-teal-700"
                >
                  Reference in message →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
