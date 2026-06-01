import React, { useState, useEffect, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiBellLine,
  RiCheckDoubleLine,
  RiDeleteBinLine,
  RiMedicineBottleLine,
  RiCalendarCheckLine,
  RiErrorWarningLine,
  RiNotificationOffLine,
} from "@remixicon/react";
import { AppContext } from "../Context/AppContext.js";
import type { AppContextType } from "../types/index.js";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "dose" | "appointment" | "alert" | "general";
  isRead: boolean;
  createdAt: string;
}

const typeIcon = (type: string) => {
  switch (type) {
    case "dose":
      return <RiMedicineBottleLine size={14} className="text-teal-500" />;
    case "appointment":
      return <RiCalendarCheckLine size={14} className="text-blue-500" />;
    case "alert":
      return <RiErrorWarningLine size={14} className="text-red-500" />;
    default:
      return <RiBellLine size={14} className="text-slate-400" />;
  }
};

const NotificationBell: React.FC = () => {
  const { token } = useContext(AppContext) as AppContextType;
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(API_PATHS.NOTIFICATIONS.GET);
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
  };

  const markOne = async (id: string) => {
    await axiosInstance.post(API_PATHS.NOTIFICATIONS.MARK_ONE_READ, {
      notificationId: id,
    });
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    if (open && unreadCount > 0) markAllRead();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!token) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all active:scale-95"
        aria-label="Notifications"
      >
        <RiBellLine size={20} className="text-slate-700" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-white border border-slate-100 rounded-[24px] shadow-xl z-[200] overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Notifications
              </p>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="p-1.5 hover:bg-slate-50 rounded-lg transition-all"
                      title="Mark all read"
                    >
                      <RiCheckDoubleLine size={15} className="text-teal-500" />
                    </button>
                    <button
                      onClick={clearAll}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-all"
                      title="Clear all"
                    >
                      <RiDeleteBinLine size={15} className="text-red-400" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col gap-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-14 bg-slate-50 rounded-2xl animate-pulse"
                    />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <RiNotificationOffLine
                    size={32}
                    className="text-slate-200 mb-3"
                  />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-wide">
                    All caught up
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    No new notifications
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((n) => (
                    <motion.div
                      key={n._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => markOne(n._id)}
                      className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:bg-slate-50 mb-1 ${!n.isRead ? "bg-teal-50/50" : ""}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${n.type === "dose" ? "bg-teal-50" : n.type === "alert" ? "bg-red-50" : "bg-slate-50"}`}
                      >
                        {typeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 leading-tight">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-1">
                          {new Date(n.createdAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" · "}
                          {new Date(n.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
