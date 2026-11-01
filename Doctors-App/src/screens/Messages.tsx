"use client";

import {
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiAttachment2,
  RiCalendarCheckLine,
  RiCapsuleLine,
  RiChat3Line,
  RiCloseLine,
  RiErrorWarningFill,
  RiInformationLine,
  RiSendPlane2Fill,
  RiVideoChatLine,
} from "@remixicon/react";
import { type FormEvent, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import JoinCallButton, { callWindow } from "@/components/patient/JoinCallButton";
import { useMessages } from "@/Context/MessagesContext";
import { useNavigate, useSearchParams } from "@/lib/navigation";
import type { ChatMessage, ChatVisit } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { slotToDate } from "@/utils/medicationUtils";
import { getSocket } from "@/utils/socket";

type Thread = {
  doctor: { _id: string; name: string; image: string; speciality: string } | null;
  visits: ChatVisit[];
  messages: ChatMessage[];
};
type About = { appointmentId?: string; medicineName?: string };

const visitLabel = (v: ChatVisit) =>
  slotToDate(v.slotDate, v.slotTime)?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) ??
  v.slotDate.replace(/_/g, "/");

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

/** "Today", "Yesterday" or "27 Mar 2026". */
const dayOf = (iso: string) => {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/** Short time for the conversation list: "2:14 PM" today, "Mon", or "27 Mar". */
const listTime = (iso: string) => {
  const d = new Date(iso);
  const ageDays = (Date.now() - d.getTime()) / 86_400_000;
  if (dayOf(iso) === "Today") return timeOf(iso);
  if (ageDays < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function aboutLabel(about: About, visits: ChatVisit[]) {
  const visit = visits.find((v) => v._id === about.appointmentId);
  if (!visit) return null;
  return about.medicineName ? `${about.medicineName} · visit ${visitLabel(visit)}` : `Visit on ${visitLabel(visit)}`;
}

export default function Messages() {
  const [params] = useSearchParams();
  const doctorId = params.get("doctor");
  const navigate = useNavigate();
  const { conversations, loaded, refresh, subscribe, setOpenDoctor } = useMessages();

  const [thread, setThread] = useState<Thread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [about, setAbout] = useState<About>({});
  const [pickingAbout, setPickingAbout] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // opened from an appointment or a medicine: attach that as the topic
  useEffect(() => {
    setAbout({
      appointmentId: params.get("appointment") ?? undefined,
      medicineName: params.get("medicine") ?? undefined,
    });
  }, [params]);

  const loadThread = useCallback(async () => {
    if (!doctorId) return;
    setLoadingThread(true);
    try {
      const { data } = await axiosInstance.get(API_PATHS.MESSAGES.THREAD(doctorId));
      if (data.success) {
        setThread({ doctor: data.doctor, visits: data.visits, messages: data.messages });
        refresh(); // opening it marked it read
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Couldn't open this conversation");
      setThread(null);
    } finally {
      setLoadingThread(false);
    }
  }, [doctorId, refresh]);

  // (re)load only when a different doctor is opened
  useEffect(() => {
    setThread(null);
    loadThread();
    setOpenDoctor(doctorId);
    return () => setOpenDoctor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  // new messages in this conversation arrive live
  useEffect(
    () =>
      subscribe((message) => {
        if (message.doctorId !== doctorId) return;
        setThread((t) =>
          t && !t.messages.some((m) => m._id === message._id) ? { ...t, messages: [...t.messages, message] } : t,
        );
        if (message.sender === "doctor" && doctorId) {
          axiosInstance
            .post(API_PATHS.MESSAGES.READ(doctorId), {}, { silent: true } as any)
            .then(() => refresh())
            .catch(() => {});
        }
      }),
    [subscribe, doctorId, refresh],
  );

  // the doctor read our messages: show "Read" under them
  useEffect(() => {
    const socket = getSocket();
    const onRead = (e: { doctorId: string; readBy: string }) => {
      if (e.readBy !== "doctor" || e.doctorId !== doctorId) return;
      const now = new Date().toISOString();
      setThread((t) =>
        t && {
          ...t,
          messages: t.messages.map((m) => (m.sender === "patient" && !m.readAt ? { ...m, readAt: now } : m)),
        },
      );
    };
    socket.on("chat_read", onRead);
    return () => {
      socket.off("chat_read", onRead);
    };
  }, [doctorId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !doctorId || sending) return;
    setSending(true);
    try {
      const { data } = await axiosInstance.post(
        API_PATHS.MESSAGES.THREAD(doctorId),
        { text: body, ...about },
        { silent: true } as any,
      );
      if (data.success) {
        setText("");
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
    // Enter sends, Shift+Enter is a new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const currentAbout = thread ? aboutLabel(about, thread.visits) : null;

  // soonest video call with this doctor that hasn't finished yet
  const nextVideoCall =
    (thread?.visits ?? [])
      .filter((v) => v.kind === "video" && !v.isCompleted && !v.missed && callWindow(v.slotDate, v.slotTime).state !== "ended")
      .sort((a, b) => (slotToDate(a.slotDate, a.slotTime)?.getTime() ?? 0) - (slotToDate(b.slotDate, b.slotTime)?.getTime() ?? 0))[0] ??
    null;

  // messages with a date divider whenever the day changes
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
  const lastOwnId = [...(thread?.messages ?? [])].reverse().find((m) => m.sender === "patient")?._id;

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="mb-5 hidden lg:block">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Messages</h1>
        <p className="text-slate-500 mt-1">Talk to your doctors about your visits and medicines.</p>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-200 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)] overflow-hidden flex h-[calc(100dvh-12.5rem)] lg:h-[calc(100dvh-13rem)] min-h-[420px]">
        {/* --- conversation list (tinted, so it reads as its own column) --- */}
        <aside
          className={`${doctorId ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 flex-col bg-slate-100/70 border-r border-slate-200`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <p className="text-[11px] font-black uppercase tracking-[2px] text-slate-500">Your doctors</p>
            {conversations.length > 0 && (
              <span className="text-[11px] font-bold text-slate-500 bg-white rounded-full px-2 py-0.5 border border-slate-200">
                {conversations.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {!loaded ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <p className="font-bold text-slate-800">No doctors to message yet</p>
                <p className="text-sm text-slate-500 mt-2">
                  Once you book an appointment, you can message that doctor here.
                </p>
                <button
                  onClick={() => navigate("/doctors")}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-teal-600"
                >
                  Find a doctor
                </button>
              </div>
            ) : (
              conversations.map((c) => {
                const active = c.doctor._id === doctorId;
                return (
                  <button
                    key={c.doctor._id}
                    onClick={() => navigate(`/messages?doctor=${c.doctor._id}`, { replace: !!doctorId })}
                    className={`relative w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all ${
                      active
                        ? "bg-white shadow-sm ring-1 ring-slate-200 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-full before:bg-teal-500"
                        : c.unread
                          ? "bg-white/80 hover:bg-white"
                          : "hover:bg-white/70"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img src={c.doctor.image} alt="" className="w-12 h-12 rounded-2xl object-cover bg-slate-100" />
                      {c.urgentUnread > 0 && (
                        <RiErrorWarningFill
                          size={18}
                          className="absolute -top-1.5 -right-1.5 text-red-600 bg-white rounded-full"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`truncate ${c.unread ? "font-black text-slate-900" : "font-bold text-slate-800"}`}>
                          {c.doctor.name}
                        </p>
                        {c.lastMessage && (
                          <span className={`text-[11px] shrink-0 ${c.unread ? "text-teal-600 font-bold" : "text-slate-400"}`}>
                            {listTime(c.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p
                          className={`text-[13px] truncate ${
                            c.urgentUnread ? "text-red-600 font-semibold" : c.unread ? "text-slate-700" : "text-slate-400"
                          }`}
                        >
                          {c.lastMessage
                            ? `${c.lastMessage.sender === "patient" ? "You: " : ""}${c.lastMessage.text}`
                            : c.doctor.speciality}
                        </p>
                        {c.unread > 0 && (
                          <span
                            className={`shrink-0 min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black text-white flex items-center justify-center ${
                              c.urgentUnread ? "bg-red-600" : "bg-teal-500"
                            }`}
                          >
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
        <section className={`${doctorId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}>
          {!doctorId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.07),transparent_60%)]">
              <div className="w-16 h-16 rounded-2xl bg-white text-teal-600 border border-teal-100 shadow-md flex items-center justify-center mb-4">
                <RiChat3Line size={26} />
              </div>
              <p className="font-black text-slate-900">Pick a doctor to start</p>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                You can also message a doctor straight from an appointment or a medicine.
              </p>
            </div>
          ) : (
            <>
              {/* header */}
              <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-200 bg-white">
                <button
                  onClick={() => navigate("/messages")}
                  className="md:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100"
                  aria-label="Back to conversations"
                >
                  <RiArrowLeftLine size={20} />
                </button>
                {thread?.doctor ? (
                  <>
                    <img src={thread.doctor.image} alt="" className="w-10 h-10 rounded-xl object-cover bg-slate-100" />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-900 truncate">{thread.doctor.name}</p>
                      <p className="text-[12px] text-slate-400 truncate">{thread.doctor.speciality}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/appointments/${doctorId}?type=video`)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 text-violet-700 border border-violet-100 text-[12px] font-bold hover:bg-violet-100"
                      title="Book a time for a video call with this doctor"
                    >
                      <RiVideoChatLine size={16} />
                      <span className="hidden sm:inline">Schedule video call</span>
                    </button>
                  </>
                ) : (
                  <div className="h-10 w-48 rounded-xl bg-slate-100 animate-pulse" />
                )}
              </div>

              {/* the next video call with this doctor, if there is one */}
              {nextVideoCall && (
                <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 bg-violet-50 border-b border-violet-100">
                  <p className="flex items-center gap-2 text-[13px] text-violet-900 min-w-0">
                    <RiVideoChatLine size={16} className="text-violet-600 shrink-0" />
                    <span className="truncate">
                      <span className="font-bold">Video call</span> · {visitLabel(nextVideoCall)}, {nextVideoCall.slotTime}
                    </span>
                  </p>
                  <JoinCallButton appointment={nextVideoCall} compact className="shrink-0" />
                </div>
              )}

              {/* messages */}
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
                      Ask {thread.doctor?.name ?? "your doctor"} about a visit, a medicine or how you&apos;re feeling.
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
                          showRead={row.m._id === lastOwnId}
                        />
                      ),
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* composer */}
              <form onSubmit={send} className="border-t border-slate-200 px-3 sm:px-4 py-3 bg-white">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                  {!!thread?.visits.length && (
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
                        Pick the visit or medicine your message is about. Your doctor sees it on the
                        message (e.g. <span className="font-bold">“Re: Paracetamol · visit 27 Mar”</span>), so
                        they know exactly what you mean without asking.
                      </InfoTip>
                      {pickingAbout && (
                        <TopicPicker
                          visits={thread.visits}
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
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    maxLength={4000}
                    placeholder="Write a message…"
                    className="flex-1 resize-none max-h-36 min-h-[46px] rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="h-[46px] w-[46px] shrink-0 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-teal-600 disabled:opacity-40 disabled:hover:bg-slate-900 transition-colors"
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
      </div>
    </div>
  );
}

function Bubble({ m, topic, showRead }: { m: ChatMessage; topic: string | null; showRead: boolean }) {
  const mine = m.sender === "patient";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] sm:max-w-[70%]">
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            mine
              ? "bg-slate-900 text-white rounded-br-md"
              : m.urgent
                ? "bg-red-50 text-red-900 border border-red-200 rounded-bl-md"
                : "bg-white text-slate-800 border border-slate-100 rounded-bl-md"
          }`}
        >
          {m.urgent && !mine && (
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-600 mb-1">
              <RiErrorWarningFill size={13} /> Urgent
            </p>
          )}
          {topic && (
            <p
              className={`text-[11px] font-bold mb-1 ${
                mine ? "text-teal-300" : m.urgent ? "text-red-500" : "text-teal-600"
              }`}
            >
              Re: {topic}
            </p>
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

/** Pick which visit or medicine a message is about. */
function TopicPicker({
  visits,
  onPick,
  onClose,
}: {
  visits: ChatVisit[];
  onPick: (about: About) => void;
  onClose: () => void;
}) {
  const sorted = [...visits].sort(
    (a, b) => (slotToDate(b.slotDate, b.slotTime)?.getTime() ?? 0) - (slotToDate(a.slotDate, a.slotTime)?.getTime() ?? 0),
  );
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 z-20 w-72 max-h-72 overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-xl p-2">
        <p className="px-3 pt-1 pb-2 text-[11px] text-slate-400 leading-snug">
          What is this message about? Your doctor will see it on the message.
        </p>
        <button
          type="button"
          onClick={() => onPick({})}
          className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          General message
        </button>
        {sorted.map((v) => (
          <div key={v._id} className="mt-1">
            <button
              type="button"
              onClick={() => onPick({ appointmentId: v._id })}
              className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              <RiCalendarCheckLine size={15} className="text-teal-600" />
              Visit on {visitLabel(v)}
              {!v.isCompleted && <span className="text-[10px] font-bold text-slate-400 ml-auto">Upcoming</span>}
            </button>
            {v.medicines.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onPick({ appointmentId: v._id, medicineName: name })}
                className="w-full flex items-center gap-2 text-left pl-9 pr-3 py-1.5 rounded-xl text-[13px] text-slate-600 hover:bg-slate-50 capitalize"
              >
                <RiCapsuleLine size={14} className="text-slate-400" />
                {name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
