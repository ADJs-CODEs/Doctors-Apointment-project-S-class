"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/navigation";
import type { GiftEvent } from "@/types";
import { getSocket } from "@/utils/socket";

const SHOW_MS = { fullscreen: 4500, banner: 5000 };

/**
 * Live Wish Well gifts for everyone online (TikTok-style):
 *  - "fullscreen" gifts take over the screen with a big animation
 *  - "banner" gifts slide in as a ribbon at the top
 * They queue, so several gifts at once play one after another. Tap to skip.
 */
export default function GiftCelebration() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<GiftEvent[]>([]);
  const current = queue[0];

  useEffect(() => {
    const socket = getSocket();
    const onGift = (e: GiftEvent) => {
      if (!e.gift || e.gift.tier === "small") return;
      setQueue((q) => (q.length > 10 ? q : [...q, e]));
    };
    socket.on("wishwell_gift", onGift);
    return () => {
      socket.off("wishwell_gift", onGift);
    };
  }, []);

  const next = useCallback(() => setQueue((q) => q.slice(1)), []);

  useEffect(() => {
    if (!current?.gift) return;
    const timer = setTimeout(next, SHOW_MS[current.gift.tier === "fullscreen" ? "fullscreen" : "banner"]);
    return () => clearTimeout(timer);
  }, [current, next]);

  // particles for the full-screen version: fixed per gift, so they don't jump on re-render
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        duration: 2.4 + Math.random() * 1.8,
        size: 18 + Math.random() * 26,
        drift: (Math.random() - 0.5) * 120,
        key: `${current?._id ?? "x"}-${i}`,
      })),
    [current],
  );

  if (!current?.gift) return null;
  const { gift } = current;

  if (gift.tier !== "fullscreen") {
    return (
      <AnimatePresence>
        <motion.button
          key={current._id ?? `${current.fromName}-${current.createdAt}`}
          onClick={() => {
            next();
            navigate("/wish-well");
          }}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 pl-2 pr-5 py-2 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 text-white shadow-2xl shadow-rose-300/50 max-w-[calc(100vw-24px)]"
        >
          <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl shrink-0">
            {gift.emoji}
          </span>
          <span className="text-sm font-bold truncate">
            {current.fromName} sent {gift.name} to {current.toName}
          </span>
        </motion.button>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key={current._id ?? `${current.fromName}-${current.createdAt}`}
        onClick={next}
        className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden cursor-pointer bg-slate-950/70 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* glow */}
        <motion.div
          className="absolute w-[70vmin] h-[70vmin] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.55),rgba(244,63,94,0.25)_45%,transparent_70%)]"
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 1.15, 1], opacity: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
        {/* falling copies of the gift */}
        {particles.map((p) => (
          <motion.span
            key={p.key}
            className="absolute top-0 select-none"
            style={{ left: `${p.left}%`, fontSize: p.size }}
            initial={{ y: "-10vh", x: 0, opacity: 0, rotate: 0 }}
            animate={{ y: "110vh", x: p.drift, opacity: [0, 1, 1, 0], rotate: 360 }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          >
            {gift.emoji}
          </motion.span>
        ))}
        {/* the gift */}
        <div className="relative flex flex-col items-center text-center px-6">
          <motion.span
            className="leading-none drop-shadow-[0_10px_40px_rgba(251,191,36,0.6)]"
            style={{ fontSize: "min(38vmin, 220px)" }}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: [0, 1.25, 1], rotate: [-30, 10, 0] }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            {gift.emoji}
          </motion.span>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4"
          >
            <p className="text-[11px] font-black uppercase tracking-[4px] text-amber-300">{gift.name}</p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-2">
              {current.fromName} <span className="text-white/60 font-bold">sent this to</span> {current.toName}
            </p>
            <p className="text-sm text-white/60 mt-2">Tap to continue</p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
