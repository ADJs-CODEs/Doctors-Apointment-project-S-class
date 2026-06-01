import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../Context/AppContext.js";
import type { AppContextType } from "../types/index.js";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  RiHeart3Fill,
  RiLoader4Line,
  RiFlowerLine,
  RiStarLine,
  RiHandHeartLine,
} from "@remixicon/react";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";

interface WishWellEntry {
  _id: string;
  patientName: string;
  patientImage: string;
  doctorName: string;
  condition: string;
  story: string;
  status: "critical" | "recovered" | "passed";
  emojiCounts: {
    heart: number;
    flower: number;
    clap: number;
    star: number;
    prayer: number;
  };
  totalEmojis: number;
  createdAt: string;
}

interface EmojiFloat {
  id: string;
  emoji: string;
  x: number;
  entryId: string;
}

const EMOJIS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🌸", label: "Flower" },
  { emoji: "👏", label: "Clap" },
  { emoji: "⭐", label: "Star" },
  { emoji: "🙏", label: "Prayer" },
];

const WishWell: React.FC = () => {
  const { token, setProgress } = useContext(AppContext) as AppContextType;
  const [entries, setEntries] = useState<WishWellEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [floaters, setFloaters] = useState<EmojiFloat[]>([]);

  const fetchEntries = async () => {
    try {
      setProgress(30);
      const { data } = await axiosInstance.get(API_PATHS.WISH_WELL.ALL);
      if (data.success) setEntries(data.entries);
    } catch (error) {
      console.error("Failed to fetch wish well:", error);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const sendEmoji = async (entryId: string, emoji: string) => {
    // Show animation immediately
    const floater: EmojiFloat = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      x: Math.random() * 60 + 20,
      entryId,
    };
    setFloaters((prev) => [...prev, floater]);
    setTimeout(
      () => setFloaters((prev) => prev.filter((f) => f.id !== floater.id)),
      2500,
    );

    // Send silently
    try {
      if (token) {
        await axiosInstance.post(API_PATHS.WISH_WELL.SEND_EMOJI, {
          entryId,
          emoji,
        });
        fetchEntries();
      } else {
        toast.info("Sign in to send wishes to patients");
      }
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const critical = entries.filter((e) => e.status === "critical");
  const recovered = entries.filter((e) => e.status === "recovered");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-16 min-h-screen relative">
      {/* Floating emojis */}
      <AnimatePresence>
        {floaters.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -300, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            style={{
              position: "fixed",
              bottom: 100,
              left: `${f.x}%`,
              zIndex: 9999,
              pointerEvents: "none",
              fontSize: 40,
            }}
          >
            {f.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-10 pb-8 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-red-500 rounded-xl text-white">
            <RiHeart3Fill size={20} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
            Wish{" "}
            <span className="text-red-500 font-serif normal-case italic">
              Well
            </span>
          </h1>
        </div>
        <p className="text-slate-400 text-sm font-medium ml-12 leading-relaxed max-w-lg">
          Send love and support to patients fighting critical illnesses. Tap any
          emoji to send it to their screen — your kindness matters.
        </p>

        {/* Stats */}
        <div className="flex gap-6 mt-6 ml-12">
          {[
            {
              label: "Fighting",
              value: critical.length,
              color: "text-red-500",
            },
            {
              label: "Recovered",
              value: recovered.length,
              color: "text-green-500",
            },
            {
              label: "Total Wishes",
              value: entries.reduce((a, e) => a + e.totalEmojis, 0),
              color: "text-teal-500",
            },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RiLoader4Line size={32} className="text-red-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Critical patients */}
          {critical.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-4">
                Sending Love To 💕
              </h2>
              {critical.map((entry) => (
                <motion.div
                  key={entry._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-red-100 rounded-[28px] p-6 shadow-sm mb-4 relative overflow-hidden"
                >
                  {/* Patient header */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 shrink-0 text-2xl">
                      {entry.patientImage ? (
                        <img
                          src={entry.patientImage.replace(
                            "/upload/",
                            "/upload/f_jpg,q_auto:best,w_200,h_200,c_fill/",
                          )}
                          alt={entry.patientName}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-slate-900 font-black text-lg">
                          {entry.patientName}
                        </p>
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-wider">
                            {entry.condition}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-xs font-medium mt-1">
                        Under care of Dr. {entry.doctorName}
                      </p>
                      <p className="text-slate-600 text-sm font-medium mt-3 italic leading-relaxed">
                        "{entry.story}"
                      </p>
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-red-500 text-2xl font-black">
                        {entry.totalEmojis}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Wishes
                      </p>
                    </div>
                  </div>

                  {/* Emoji counts */}
                  {entry.totalEmojis > 0 && (
                    <div className="flex gap-3 mb-4 flex-wrap">
                      {Object.entries(entry.emojiCounts).map(([key, count]) => {
                        const emojiMap: Record<string, string> = {
                          heart: "❤️",
                          flower: "🌸",
                          clap: "👏",
                          star: "⭐",
                          prayer: "🙏",
                        };
                        return count > 0 ? (
                          <div
                            key={key}
                            className="flex items-center gap-1 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100"
                          >
                            <span className="text-sm">{emojiMap[key]}</span>
                            <span className="text-xs font-black text-slate-500">
                              {count}
                            </span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Send emoji — TikTok style, tap directly */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      Tap to send a wish
                    </p>
                    <div className="flex gap-3">
                      {EMOJIS.map(({ emoji, label }) => (
                        <button
                          key={emoji}
                          onClick={() => sendEmoji(entry._id, emoji)}
                          className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 rounded-2xl transition-all active:scale-90 hover:scale-105"
                        >
                          <span className="text-2xl">{emoji}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Recovered patients */}
          {recovered.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-4">
                🎉 Recovered — Congratulations!
              </h2>
              {recovered.map((entry) => (
                <motion.div
                  key={entry._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-100 rounded-[28px] p-6 shadow-sm mb-4"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center border border-green-200 shrink-0 overflow-hidden">
                      {entry.patientImage ? (
                        <img
                          src={entry.patientImage.replace(
                            "/upload/",
                            "/upload/f_jpg,q_auto:best,w_200,h_200,c_fill/",
                          )}
                          alt={entry.patientName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">👤</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 font-black text-lg">
                        {entry.patientName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <p className="text-green-600 text-xs font-black uppercase tracking-wider">
                          All Clear — Recovered!
                        </p>
                      </div>
                    </div>
                    <p className="text-3xl">🔔</p>
                  </div>

                  {/* Love badge */}
                  <div className="bg-white rounded-2xl p-5 border border-green-100 text-center">
                    <p className="text-green-500 text-4xl font-black mb-2">
                      {entry.totalEmojis}
                    </p>
                    <p className="text-green-700 font-bold text-sm">
                      Wishes of Love Received from the Community 💕
                    </p>
                    <div className="flex justify-center gap-3 mt-4 flex-wrap">
                      {Object.entries(entry.emojiCounts).map(([key, count]) => {
                        const emojiMap: Record<string, string> = {
                          heart: "❤️",
                          flower: "🌸",
                          clap: "👏",
                          star: "⭐",
                          prayer: "🙏",
                        };
                        return count > 0 ? (
                          <div
                            key={key}
                            className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1"
                          >
                            <span className="text-base">{emojiMap[key]}</span>
                            <span className="text-sm font-black text-green-700">
                              {count}
                            </span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-[28px] text-center px-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-400 mb-4">
                <RiHeart3Fill size={32} />
              </div>
              <h3 className="font-black text-slate-900 text-xl mb-2">
                The Wish Well is Empty
              </h3>
              <p className="text-slate-400 text-sm font-medium max-w-xs leading-relaxed">
                When doctors feature patients here, you can send them love and
                support that appears on their screen.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WishWell;
