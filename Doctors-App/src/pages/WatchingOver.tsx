/**
 * WatchingOver.tsx  —  WEB frontend
 *
 * REPLACE your existing WatchingOver.tsx
 *
 * What's new:
 * - Live emoji sending row added to every "People I'm Watching" card
 * - Uses your existing sendEmojiToPatient (axiosInstance + addEmoji local animation)
 * - Emoji palette: ❤️ 🙏 👏 ⭐ 💪 — same as WishWell style
 * - All existing logic (requests, respond, remove, modal) is UNCHANGED
 */

import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../Context/AppContext.js";
import type { AppContextType } from "../types/index.js";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useEmoji } from "../Context/EmojiContext.js";
import {
  RiEyeLine,
  RiUserAddLine,
  RiCloseLine,
  RiArrowRightLine,
  RiHeartPulseLine,
  RiMedicineBottleLine,
  RiCalendarCheckLine,
  RiLoader4Line,
} from "@remixicon/react";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";

interface Connection {
  _id: string;
  requesterId: string;
  patientId: string;
  status: string;
  patient?: { name: string; email: string; image: string };
  watcher?: { name: string; email: string; image: string };
  requester?: { name: string; email: string; image: string };
}

// ── Emoji palette ─────────────────────────────────────────────────
const EMOJIS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🙏", label: "Prayer" },
  { emoji: "👏", label: "Clap" },
  { emoji: "⭐", label: "Star" },
  { emoji: "💪", label: "Strong" },
];

const WatchingOver: React.FC = () => {
  const { token, setProgress } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();
  const { addEmoji } = useEmoji();

  const [watching, setWatching] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<Connection[]>([]);
  const [watchers, setWatchers] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  // Track which emoji+user is currently sending (key = `${userId}-${emoji}`)
  const [emojiSending, setEmojiSending] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setProgress(30);
      const [watchingRes, requestsRes, watchersRes] = await Promise.all([
        axiosInstance.get(API_PATHS.CONNECTIONS.WATCHING_OVER),
        axiosInstance.get(API_PATHS.CONNECTIONS.MY_REQUESTS),
        axiosInstance.get(API_PATHS.CONNECTIONS.MY_WATCHERS),
      ]);
      if (watchingRes.data.success) setWatching(watchingRes.data.watching);
      if (requestsRes.data.success) setRequests(requestsRes.data.requests);
      if (watchersRes.data.success) setWatchers(watchersRes.data.watchers);
    } catch (error: any) {
      toast.error("Failed to load connections");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  // ── Send live emoji ───────────────────────────────────────────────
  const sendEmojiToPatient = async (toUserId: string, emoji: string) => {
    const key = `${toUserId}-${emoji}`;
    if (emojiSending) return; // prevent double-tap
    setEmojiSending(key);

    // Instant local animation via EmojiContext
    addEmoji(emoji, 1);

    try {
      await axiosInstance.post(API_PATHS.EMOJI.SEND, { toUserId, emoji });
    } catch {
      // silent — the animation already showed
    } finally {
      setEmojiSending(null);
    }
  };

  const sendRequest = async () => {
    if (!email.trim()) return toast.error("Please enter an email address");
    try {
      setSending(true);
      const { data } = await axiosInstance.post(API_PATHS.CONNECTIONS.REQUEST, {
        patientEmail: email.trim().toLowerCase(),
      });
      if (data.success) {
        toast.success("Connection request sent!");
        setEmail("");
        setShowModal(false);
        fetchAll();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send request");
    } finally {
      setSending(false);
    }
  };

  const respond = async (
    connectionId: string,
    action: "accepted" | "rejected",
  ) => {
    try {
      setResponding(connectionId);
      const { data } = await axiosInstance.post(API_PATHS.CONNECTIONS.RESPOND, {
        connectionId,
        action,
      });
      if (data.success) {
        toast.success(
          action === "accepted" ? "Connection accepted!" : "Request declined",
        );
        fetchAll();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error("Failed to respond");
    } finally {
      setResponding(null);
    }
  };

  const removeConnection = async (connectionId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from your connections?`)) return;
    try {
      const { data } = await axiosInstance.post(API_PATHS.CONNECTIONS.REMOVE, {
        connectionId,
      });
      if (data.success) {
        toast.success("Connection removed");
        fetchAll();
      }
    } catch {
      toast.error("Failed to remove connection");
    }
  };

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-16 min-h-screen">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
              <RiEyeLine size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Watching{" "}
              <span className="text-teal-500 font-serif normal-case italic">
                Over
              </span>
            </h1>
          </div>
          <p className="text-slate-400 text-xs font-medium ml-12">
            Monitor the health of people you care about
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-teal-600 transition-all active:scale-95"
        >
          <RiUserAddLine size={16} />
          Watch Over Someone
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RiLoader4Line size={32} className="text-teal-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Pending requests ── */}
          {requests.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">
                  Pending Requests
                </h2>
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-black">
                    {requests.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {requests.map((req) => (
                  <motion.div
                    key={req._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-teal-100 rounded-[24px] p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100">
                        <RiEyeLine size={20} className="text-teal-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-900 font-black text-base">
                          {req.requester?.name}
                        </p>
                        <p className="text-slate-400 text-xs font-medium">
                          {req.requester?.email}
                        </p>
                        <p className="text-teal-600 text-xs font-bold mt-0.5 uppercase tracking-wider">
                          Wants to watch over you
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => respond(req._id, "rejected")}
                        disabled={responding === req._id}
                        className="flex-1 border border-red-100 bg-red-50 text-red-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95"
                      >
                        {responding === req._id ? (
                          <RiLoader4Line
                            size={14}
                            className="animate-spin mx-auto"
                          />
                        ) : (
                          "Decline"
                        )}
                      </button>
                      <button
                        onClick={() => respond(req._id, "accepted")}
                        disabled={responding === req._id}
                        className="flex-1 bg-teal-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-600 transition-all active:scale-95"
                      >
                        {responding === req._id ? (
                          <RiLoader4Line
                            size={14}
                            className="animate-spin mx-auto"
                          />
                        ) : (
                          "Accept"
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── People I'm watching ── */}
          {watching.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-4">
                People I'm Watching
              </h2>
              <div className="space-y-3">
                {watching.map((conn) => (
                  <motion.div
                    key={conn._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm"
                  >
                    {/* Person row */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100 shrink-0">
                        <RiEyeLine size={22} className="text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-black text-lg">
                          {conn.patient?.name}
                        </p>
                        <p className="text-slate-400 text-xs font-medium">
                          {conn.patient?.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-2 h-2 rounded-full bg-teal-400" />
                          <p className="text-teal-600 text-[10px] font-black uppercase tracking-wider">
                            Connected
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() =>
                            navigate(`/watching/${conn.patientId}`)
                          }
                          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-600 transition-all active:scale-95"
                        >
                          View
                          <RiArrowRightLine size={12} />
                        </button>
                        <button
                          onClick={() =>
                            removeConnection(conn._id, conn.patient?.name || "")
                          }
                          className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-400 hover:bg-red-100 transition-all active:scale-95"
                        >
                          <RiCloseLine size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Quick stat chips */}
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50">
                      {[
                        {
                          icon: <RiCalendarCheckLine size={14} />,
                          label: "Appointments",
                          color: "text-teal-500",
                        },
                        {
                          icon: <RiMedicineBottleLine size={14} />,
                          label: "Medications",
                          color: "text-blue-500",
                        },
                        {
                          icon: <RiHeartPulseLine size={14} />,
                          label: "Vitals",
                          color: "text-rose-500",
                        },
                      ].map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className={s.color}>{s.icon}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* ── LIVE EMOJI BAR ── */}
                    <div className="mt-4 pt-4 border-t border-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] mb-3">
                        Send a live wish → appears on their screen instantly
                      </p>
                      <div className="flex gap-2">
                        {EMOJIS.map(({ emoji, label }) => {
                          const key = `${conn.patientId}-${emoji}`;
                          const isSending = emojiSending === key;
                          return (
                            <button
                              key={emoji}
                              onClick={() =>
                                sendEmojiToPatient(conn.patientId, emoji)
                              }
                              disabled={!!emojiSending}
                              className={`
                                flex-1 flex flex-col items-center gap-1.5 py-3
                                bg-slate-50 hover:bg-teal-50
                                border border-slate-100 hover:border-teal-200
                                rounded-2xl transition-all
                                ${isSending ? "scale-95 opacity-60" : "active:scale-90 hover:scale-105"}
                                cursor-pointer disabled:cursor-not-allowed
                              `}
                            >
                              {isSending ? (
                                <RiLoader4Line
                                  size={18}
                                  className="text-teal-500 animate-spin"
                                />
                              ) : (
                                <>
                                  <span className="text-xl leading-none">
                                    {emoji}
                                  </span>
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                    {label}
                                  </span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── People watching me ── */}
          {watchers.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-4">
                Watching Over Me
              </h2>
              <div className="space-y-3">
                {watchers.map((conn) => (
                  <motion.div
                    key={conn._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm flex items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shrink-0">
                      <RiEyeLine size={18} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-black text-base">
                        {conn.watcher?.name}
                      </p>
                      <p className="text-slate-400 text-xs font-medium">
                        {conn.watcher?.email}
                      </p>
                      <p className="text-blue-500 text-[10px] font-black uppercase tracking-wider mt-0.5">
                        Monitoring your health
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        removeConnection(conn._id, conn.watcher?.name || "")
                      }
                      className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-400 hover:bg-red-100 transition-all active:scale-95 shrink-0"
                    >
                      <RiCloseLine size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {watching.length === 0 &&
            requests.length === 0 &&
            watchers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-[28px] text-center px-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <RiEyeLine size={32} />
                </div>
                <h3 className="font-black text-slate-900 text-xl mb-2">
                  No connections yet
                </h3>
                <p className="text-slate-400 text-sm font-medium max-w-xs leading-relaxed">
                  Watch over a family member or loved one by clicking the button
                  above and entering their email address.
                </p>
              </div>
            )}
        </div>
      )}

      {/* ── Connect Modal ── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Watch Over Someone
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEmail("");
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <RiCloseLine size={20} className="text-slate-400" />
                </button>
              </div>

              <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed">
                Enter the email address of the person you want to monitor. They
                will receive a notification to approve your request.
              </p>

              <div className="mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Their Email Address
                </p>
                <input
                  type="email"
                  placeholder="their@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendRequest()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 text-sm font-medium outline-none focus:border-teal-500/50 focus:bg-white transition-all placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEmail("");
                  }}
                  className="flex-1 border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={sendRequest}
                  disabled={sending}
                  className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-600 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {sending ? (
                    <RiLoader4Line size={16} className="animate-spin" />
                  ) : (
                    <>
                      <RiUserAddLine size={14} />
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WatchingOver;
