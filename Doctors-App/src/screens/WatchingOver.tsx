"use client";

/**
 * The care circle: people you watch over (send them live wishes and nudges, open their care),
 * people watching over you, and requests waiting for your answer.
 */

import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../Context/AppContext";
import type { AppContextType } from "../types/index";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "@/lib/navigation";
import NudgePanel from "../components/NudgePanel";
import ConfirmDialog from "../components/ConfirmDialog";
import WishButton from "../components/wishwell/WishButton";
import { RiUserAddLine, RiCloseLine, RiArrowRightLine, RiLoader4Line, RiTeamLine, RiUserUnfollowLine } from "@remixicon/react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

interface Connection {
  _id: string;
  requesterId: string;
  patientId: string;
  status: string;
  patient?: { name: string; email: string; image: string };
  watcher?: { name: string; email: string; image: string };
  requester?: { name: string; email: string; image: string };
}

// live wishes (the server stores these characters)
const EMOJIS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🙏", label: "Prayer" },
  { emoji: "👏", label: "Clap" },
  { emoji: "⭐", label: "Star" },
  { emoji: "💪", label: "Strong" },
];

function Person({ who, note }: { who?: { name: string; email: string; image: string }; note: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 min-w-0 flex-1">
      <img src={who?.image} alt="" className="w-12 h-12 rounded-[14px] object-cover bg-brand-soft border border-line shrink-0" />
      <div className="min-w-0">
        <p className="text-[17px] font-bold text-ink truncate">{who?.name}</p>
        <p className="text-[13px] text-ink-3 truncate">{who?.email}</p>
        <div className="mt-0.5">{note}</div>
      </div>
    </div>
  );
}

const WatchingOver: React.FC = () => {
  const { token } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();

  const [watching, setWatching] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<Connection[]>([]);
  const [watchers, setWatchers] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

  const fetchAll = async () => {
    try {
      const [watchingRes, requestsRes, watchersRes] = await Promise.all([
        axiosInstance.get(API_PATHS.CONNECTIONS.WATCHING_OVER),
        axiosInstance.get(API_PATHS.CONNECTIONS.MY_REQUESTS),
        axiosInstance.get(API_PATHS.CONNECTIONS.MY_WATCHERS),
      ]);
      if (watchingRes.data.success) setWatching(watchingRes.data.watching);
      if (requestsRes.data.success) setRequests(requestsRes.data.requests);
      if (watchersRes.data.success) setWatchers(watchersRes.data.watchers);
    } catch {
      toast.error("Couldn't load your care circle");
    } finally {
      setLoading(false);
    }
  };

  // the button animates on this screen; the wish pops up on theirs
  const sendEmojiToPatient = async (toUserId: string, emoji: string) => {
    try {
      await axiosInstance.post(API_PATHS.EMOJI.SEND, { toUserId, emoji }, { silent: true } as any);
    } catch {
      // silent: the button already showed it going
    }
  };

  const sendRequest = async () => {
    if (!email.trim()) return toast.error("Enter their email address");
    try {
      setSending(true);
      const { data } = await axiosInstance.post(API_PATHS.CONNECTIONS.REQUEST, { patientEmail: email.trim().toLowerCase() });
      if (data.success) {
        toast.success("Request sent. They'll get a notification to approve it.");
        setEmail("");
        setShowModal(false);
        fetchAll();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Couldn't send the request");
    } finally {
      setSending(false);
    }
  };

  const respond = async (connectionId: string, action: "accepted" | "rejected") => {
    try {
      setResponding(connectionId);
      const { data } = await axiosInstance.post(API_PATHS.CONNECTIONS.RESPOND, { connectionId, action });
      if (data.success) {
        toast.success(action === "accepted" ? "They're in your care circle now" : "Request declined");
        fetchAll();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("That didn't work. Please try again.");
    } finally {
      setResponding(null);
    }
  };

  const removeConnection = async () => {
    if (!removing) return;
    try {
      const { data } = await axiosInstance.post(API_PATHS.CONNECTIONS.REMOVE, { connectionId: removing.id });
      if (data.success) {
        toast.success(`${removing.name} is no longer in your care circle`);
        fetchAll();
      }
    } catch {
      toast.error("Couldn't remove them. Please try again.");
    }
    setRemoving(null);
  };

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  const closeModal = () => {
    setShowModal(false);
    setEmail("");
  };

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-8 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5">Your care circle</p>
          <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink">
            The people who care, in the loop.
          </h1>
          <p className="text-[16px] text-ink-2 mt-2 max-w-xl">
            Watch over family and friends, and let the people who love you watch over you.
          </p>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="btn btn-ink self-start sm:self-auto shrink-0">
          <RiUserAddLine size={18} /> Watch over someone
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-48 rounded-[24px] bg-line/70 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* waiting for your answer */}
          {requests.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-[18px] font-bold text-ink mb-3">
                Waiting for your answer
                <span className="num text-[12px] text-white bg-rose-500 rounded-full px-2 py-0.5">{requests.length}</span>
              </h2>
              <div className="space-y-3">
                {requests.map((req) => (
                  <motion.div key={req._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface rounded-[22px] p-5 !border-[#C4E8E5]">
                    <Person who={req.requester} note={<p className="text-[13px] font-semibold text-brand-ink">Wants to watch over you</p>} />
                    <p className="text-[14px] text-ink-2 mt-3">
                      If you accept, they&apos;ll see your visits and doses, hear when you miss a dose, and can send you nudges.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => respond(req._id, "rejected")}
                        disabled={responding === req._id}
                        className="btn flex-1 bg-white border border-line text-ink-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                      >
                        Decline
                      </button>
                      <button type="button" onClick={() => respond(req._id, "accepted")} disabled={responding === req._id} className="btn btn-teal flex-1">
                        {responding === req._id ? <RiLoader4Line size={16} className="animate-spin" /> : "Accept"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* people I watch over */}
          {watching.length > 0 && (
            <section>
              <h2 className="text-[18px] font-bold text-ink mb-3">People you watch over</h2>
              <div className="space-y-4">
                {watching.map((conn) => (
                  <motion.div key={conn._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface rounded-[24px] p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <Person
                        who={conn.patient}
                        note={
                          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-ink">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand" /> Connected
                          </p>
                        }
                      />
                      <button type="button" onClick={() => navigate(`/watching/${conn.patientId}`)} className="btn btn-ink shrink-0 !py-2.5 !px-3.5 !text-[14px]">
                        View <RiArrowRightLine size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Stop watching over ${conn.patient?.name}`}
                        onClick={() => setRemoving({ id: conn._id, name: conn.patient?.name || "them" })}
                        className="p-2.5 rounded-xl text-ink-3 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                      >
                        <RiCloseLine size={18} />
                      </button>
                    </div>

                    {/* live wishes: land on their screen as they happen */}
                    <div className="mt-5 pt-4 border-t border-line">
                      <p className="text-[14px] font-bold text-ink mb-1">Send a live wish</p>
                      <p className="text-[13px] text-ink-3 mb-3">It pops up on their screen as you send it.</p>
                      <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-2" role="group" aria-label="Send a live wish">
                        {EMOJIS.map(({ emoji, label }, k) => (
                          <WishButton key={emoji} emoji={emoji} label={label} index={k} onSend={() => sendEmojiToPatient(conn.patientId, emoji)} />
                        ))}
                      </div>
                    </div>

                    {/* a notification that reaches their phone even with the app closed */}
                    <div className="mt-4 pt-4 border-t border-line">
                      <NudgePanel toUserId={conn.patientId} name={conn.patient?.name || "them"} as="caregiver" compact />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* people watching over me */}
          {watchers.length > 0 && (
            <section>
              <h2 className="text-[18px] font-bold text-ink mb-3">Watching over you</h2>
              <div className="space-y-3">
                {watchers.map((conn) => (
                  <motion.div key={conn._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface rounded-[22px] p-5">
                    <div className="flex items-center gap-3">
                      <Person who={conn.watcher} note={<p className="text-[13px] font-semibold text-ink-3">Sees your visits and doses</p>} />
                      <button
                        type="button"
                        aria-label={`Remove ${conn.watcher?.name}`}
                        onClick={() => setRemoving({ id: conn._id, name: conn.watcher?.name || "them" })}
                        className="p-2.5 rounded-xl text-ink-3 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                      >
                        <RiCloseLine size={18} />
                      </button>
                    </div>
                    {/* reply to the people looking after you */}
                    <div className="mt-4 pt-4 border-t border-line">
                      <NudgePanel toUserId={conn.requesterId} name={conn.watcher?.name || "them"} as="patient" compact />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {watching.length === 0 && requests.length === 0 && watchers.length === 0 && (
            <div className="glass flex flex-col items-center justify-center py-16 rounded-[24px] text-center px-6">
              <span className="w-14 h-14 mb-4 rounded-[16px] grid place-items-center bg-brand-soft text-brand-ink border border-[#C4E8E5]">
                <RiTeamLine size={26} />
              </span>
              <h3 className="text-[20px] font-extrabold text-ink mb-1.5">Your care circle is empty</h3>
              <p className="text-[15px] text-ink-2 max-w-sm leading-relaxed">
                Watch over a family member or friend: tap “Watch over someone” and enter their email. They approve it first.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ask to watch over someone */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm" onClick={closeModal}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="watch-title"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="glass !bg-white/92 rounded-[24px] p-6 sm:p-7 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 id="watch-title" className="text-[22px] font-extrabold tracking-[-0.02em] text-ink">
                  Watch over someone
                </h2>
                <button type="button" aria-label="Close" onClick={closeModal} className="p-2 rounded-xl text-ink-3 hover:bg-white">
                  <RiCloseLine size={20} />
                </button>
              </div>
              <p className="text-[15px] text-ink-2 mb-5 leading-relaxed">
                Enter the email they use for their account. They&apos;ll get a notification to approve your request.
              </p>
              <label className="flex flex-col gap-1.5 mb-5">
                <span className="text-[14px] font-bold text-ink">Their email</span>
                <input
                  type="email"
                  placeholder="their@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendRequest()}
                  className="field"
                  autoFocus
                />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={closeModal} className="btn btn-glass !bg-white flex-1">
                  Cancel
                </button>
                <button type="button" onClick={sendRequest} disabled={sending} className="btn btn-ink flex-[2]">
                  {sending ? <RiLoader4Line size={16} className="animate-spin" /> : <><RiUserAddLine size={16} /> Send request</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!removing}
        danger
        icon={<RiUserUnfollowLine size={22} />}
        title={`Remove ${removing?.name}?`}
        body="You'll stop seeing each other's updates. You can ask to connect again later."
        cancelLabel="Keep them"
        confirmLabel="Remove"
        busyLabel="Removing…"
        onCancel={() => setRemoving(null)}
        onConfirm={removeConnection}
      />
    </div>
  );
};

export default WatchingOver;
