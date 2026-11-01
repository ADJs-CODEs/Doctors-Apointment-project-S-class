"use client";

import {
  RiAlarmWarningLine,
  RiCalendarCheckLine,
  RiChat3Line,
  RiCheckDoubleLine,
  RiDeleteBinLine,
  RiNotification3Line,
} from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@/lib/navigation";
import { API_PATHS } from "../utils/apiPath";
import axiosInstance from "../utils/axiosInstance";
import { getSocket } from "../utils/socket";

type DoctorNotification = {
  _id: string;
  title: string;
  message: string;
  type: "appointment" | "alert" | "message" | "payment" | "general" | "dose" | "care";
  link?: string;
  isRead: boolean;
  createdAt: string;
};

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const ICON = {
  alert: { Icon: RiAlarmWarningLine, tone: "bg-red-50 text-red-600" },
  message: { Icon: RiChat3Line, tone: "bg-sky-50 text-sky-600" },
  appointment: { Icon: RiCalendarCheckLine, tone: "bg-teal-50 text-teal-600" },
} as const;

/**
 * The doctor's bell: bookings, cancellations, visits starting, visits to close, no-shows and
 * early doses. New ones arrive live over the socket (the doctor's room is joined by
 * DoctorMessagesProvider) and pop a toast.
 */
export default function DoctorBell() {
  const [items, setItems] = useState<DoctorNotification[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.NOTIFICATIONS.LIST, { silent: true } as any);
      if (data.success) setItems(data.notifications);
    } catch {
      // keep what we have
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const go = useCallback(
    (n: DoctorNotification) => {
      setOpen(false);
      if (!n.isRead) {
        setItems((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
        axiosInstance.post(API_PATHS.NOTIFICATIONS.MARK_ONE_READ, { notificationId: n._id }, { silent: true } as any).catch(() => {});
      }
      if (n.link) navigate(n.link);
    },
    [navigate],
  );

  // live: new notifications for this doctor
  useEffect(() => {
    const socket = getSocket();
    const onNew = (n: DoctorNotification) => {
      setItems((list) => (list.some((x) => x._id === n._id) ? list : [n, ...list].slice(0, 30)));
      const show = n.type === "alert" ? toast.warning : toast.message;
      show(n.title, { description: n.message, action: n.link ? { label: "Open", onClick: () => go(n) } : undefined });
    };
    // a reconnect may have missed some
    socket.on("notification", onNew);
    socket.on("connect", load);
    return () => {
      socket.off("notification", onNew);
      socket.off("connect", load);
    };
  }, [go, load]);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.isRead).length;

  const markAll = async () => {
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    await axiosInstance.post(API_PATHS.NOTIFICATIONS.MARK_ALL_READ, {}, { silent: true } as any).catch(() => load());
  };

  const clear = async () => {
    setItems([]);
    await axiosInstance.post(API_PATHS.NOTIFICATIONS.CLEAR, {}, { silent: true } as any).catch(() => load());
  };

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 hover:text-teal-600 hover:border-teal-100 transition-colors"
      >
        <RiNotification3Line size={20} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-20 sm:top-auto sm:mt-3 sm:w-96 z-50 bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-300/40 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-slate-100">
            <div>
              <p className="font-black text-slate-900">Notifications</p>
              <p className="text-[11px] text-slate-400">{unread ? `${unread} unread` : "You're all caught up"}</p>
            </div>
            {items.length > 0 && (
              <div className="flex gap-1">
                <button
                  onClick={markAll}
                  disabled={!unread}
                  title="Mark all as read"
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-teal-600 disabled:opacity-30"
                >
                  <RiCheckDoubleLine size={18} />
                </button>
                <button onClick={clear} title="Clear all" className="p-2 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                  <RiDeleteBinLine size={18} />
                </button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <RiNotification3Line size={28} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700 mt-2">No notifications</p>
              <p className="text-[12px] text-slate-400 mt-1">New bookings, cancellations and patient alerts show up here.</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {items.map((n) => {
                const { Icon, tone } = ICON[n.type as keyof typeof ICON] ?? ICON.appointment;
                return (
                  <li key={n._id}>
                    <button
                      onClick={() => go(n)}
                      className={`w-full flex gap-3 text-left px-5 py-3.5 hover:bg-slate-50 transition-colors ${n.isRead ? "" : "bg-teal-50/40"}`}
                    >
                      <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}>
                        <Icon size={17} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-sm ${n.isRead ? "font-semibold text-slate-700" : "font-black text-slate-900"}`}>{n.title}</span>
                          {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-teal-500 shrink-0" aria-label="unread" />}
                        </span>
                        <span className="block text-[12px] text-slate-500 leading-snug mt-0.5">{n.message}</span>
                        <span className="block text-[11px] text-slate-400 mt-1">{ago(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
