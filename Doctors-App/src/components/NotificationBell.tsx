"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiNotification3Line,
  RiCheckDoubleLine,
  RiDeleteBinLine,
  RiCapsuleLine,
  RiCalendarCheckLine,
  RiErrorWarningLine,
  RiChat3Line,
  RiBankCardLine,
  RiTeamLine,
  RiCloseLine,
} from "@remixicon/react";
import { AppContext } from "../Context/AppContext";
import type { AppContextType, AppNotification } from "../types/index";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";
import { getSocket } from "../utils/socket";
import { useNavigate } from "@/lib/navigation";
import { DeviceNotificationsSwitch } from "./patient/DeviceNotifications";
import ConfirmDialog from "./ConfirmDialog";

type Notification = AppNotification;

// one calm tile per kind; colour only says what it's about
const TYPE_STYLE: Record<string, { icon: React.ReactNode; tile: string }> = {
  dose: { icon: <RiCapsuleLine size={16} />, tile: "text-brand-ink bg-brand-soft" },
  appointment: { icon: <RiCalendarCheckLine size={16} />, tile: "text-[#3554C4] bg-[#E8EDFB]" },
  alert: { icon: <RiErrorWarningLine size={16} />, tile: "text-rose-600 bg-rose-50" },
  message: { icon: <RiChat3Line size={16} />, tile: "text-brand-ink bg-brand-soft" },
  payment: { icon: <RiBankCardLine size={16} />, tile: "text-emerald-700 bg-emerald-50" },
  care: { icon: <RiTeamLine size={16} />, tile: "text-video bg-video-soft" },
};
const typeStyle = (type: string) => TYPE_STYLE[type] ?? { icon: <RiNotification3Line size={16} />, tile: "text-ink-3 bg-canvas" };

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.round(mins / 1440)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

const NotificationBell: React.FC = () => {
  const { token } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setLoading(true);
      // silent: this also runs in the background; it shouldn't flash the loading bar
      const { data } = await axiosInstance.get(API_PATHS.NOTIFICATIONS.GET, { silent: true } as any);
      if (data.success) setNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    await axiosInstance.post(API_PATHS.NOTIFICATIONS.MARK_ALL_READ);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearAll = async () => {
    await axiosInstance.post(API_PATHS.NOTIFICATIONS.CLEAR);
    setNotifications([]);
    setConfirmClear(false);
  };

  const markOne = async (id: string) => {
    await axiosInstance.post(API_PATHS.NOTIFICATIONS.MARK_ONE_READ, { notificationId: id });
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      // new ones arrive live over the socket; this slow poll is just a safety net
      const interval = setInterval(fetchNotifications, 5 * 60_000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // live: the server pushes each new notification as it's created
  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    const onNew = (n: Notification) =>
      setNotifications((prev) => (prev.some((p) => p._id === n._id) ? prev : [n, ...prev].slice(0, 20)));
    socket.on("notification", onNew);
    return () => {
      socket.off("notification", onNew);
    };
  }, [token]);

  const openOne = (n: Notification) => {
    if (!n.isRead) markOne(n._id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  useEffect(() => {
    if (open && unreadCount > 0) markAllRead();
  }, [open]);

  // close on a click outside or Escape (but not while the "clear all?" box is up)
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!confirmClear && panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !confirmClear && setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, confirmClear]);

  if (!token) return null;

  const today = notifications.filter((n) => isToday(n.createdAt));
  const earlier = notifications.filter((n) => !isToday(n.createdAt));

  const row = (n: Notification) => {
    const s = typeStyle(n.type);
    return (
      <li key={n._id}>
        <button
          type="button"
          onClick={() => openOne(n)}
          className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-[14px] transition-colors hover:bg-canvas ${!n.isRead ? "bg-brand-soft/40" : ""}`}
        >
          <span className={`w-9 h-9 rounded-[11px] grid place-items-center shrink-0 ${s.tile}`}>{s.icon}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-bold text-ink leading-snug">{n.title}</span>
            <span className="block text-[13px] text-ink-2 mt-0.5 leading-relaxed line-clamp-3">{n.message}</span>
            <span className="block text-[12px] text-ink-3 mt-1">{ago(n.createdAt)}</span>
          </span>
          {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-2" aria-label="New" />}
        </button>
      </li>
    );
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="relative w-10 h-10 grid place-items-center rounded-xl bg-white border border-line hover:border-ink-3/40 transition-colors active:scale-95"
        aria-label={unreadCount ? `Notifications, ${unreadCount} new` : "Notifications"}
        aria-expanded={open}
      >
        <RiNotification3Line size={20} className="text-ink" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="num absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] rounded-full grid place-items-center ring-2 ring-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            // phones: a full-width panel under the top bar; wider: a dropdown under the bell
            className="surface !bg-white shadow-[0_24px_60px_rgba(11,37,69,.18)] fixed inset-x-3 top-[76px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px] rounded-[22px] z-[200] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 pl-5 pr-3 py-3.5 border-b border-line">
              <p className="text-[16px] font-bold text-ink">Notifications</p>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <>
                    <button type="button" onClick={markAllRead} className="p-2 rounded-lg text-ink-3 hover:text-brand-ink hover:bg-canvas" title="Mark all as read" aria-label="Mark all as read">
                      <RiCheckDoubleLine size={18} />
                    </button>
                    <button type="button" onClick={() => setConfirmClear(true)} className="p-2 rounded-lg text-ink-3 hover:text-rose-600 hover:bg-rose-50" title="Clear all" aria-label="Clear all">
                      <RiDeleteBinLine size={18} />
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg text-ink-3 hover:bg-canvas sm:hidden" aria-label="Close">
                  <RiCloseLine size={18} />
                </button>
              </div>
            </div>

            <DeviceNotificationsSwitch />

            <div className="max-h-[min(440px,calc(100dvh-200px))] overflow-y-auto overscroll-contain p-2">
              {loading && notifications.length === 0 ? (
                <div className="flex flex-col gap-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-line/60 rounded-[14px] animate-pulse" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <span className="w-12 h-12 mb-3 rounded-[14px] grid place-items-center bg-brand-soft text-brand-ink">
                    <RiCheckDoubleLine size={22} />
                  </span>
                  <p className="text-[15px] font-bold text-ink">You&apos;re all caught up</p>
                  <p className="text-[13px] text-ink-3 mt-0.5">Reminders, messages and updates show up here.</p>
                </div>
              ) : (
                <>
                  {today.length > 0 && (
                    <>
                      <p className="px-3 pt-2 pb-1 text-[12px] font-bold text-ink-3">Today</p>
                      <ul>{today.map(row)}</ul>
                    </>
                  )}
                  {earlier.length > 0 && (
                    <>
                      <p className="px-3 pt-3 pb-1 text-[12px] font-bold text-ink-3">Earlier</p>
                      <ul>{earlier.map(row)}</ul>
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmClear}
        danger
        icon={<RiDeleteBinLine size={22} />}
        title="Clear all notifications?"
        body="They'll be removed from this list. Reminders and messages themselves aren't affected."
        cancelLabel="Keep them"
        confirmLabel="Clear all"
        busyLabel="Clearing…"
        onCancel={() => setConfirmClear(false)}
        onConfirm={clearAll}
      />
    </div>
  );
};

export default NotificationBell;
