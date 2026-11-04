"use client";

import { AnimatePresence, motion } from "framer-motion";
import NotoEmoji from "@/components/brand/NotoEmoji";
import { RollingNumber } from "./WishButton";

export type LiveLove = {
  /** the emoji that just arrived */
  emoji: string;
  /** Wish Well: the patient's running total, from the server */
  total?: number;
  /** how many arrived in this burst (used when there's no total, e.g. from the care circle) */
  burst: number;
  /** who it's from, when it's a person (care circle); the Wish Well is anonymous */
  from?: string;
  /** bumps on every arrival, so the emoji replays */
  tick: number;
};

/**
 * The small counter in the corner while love is arriving: the emoji, and the number going up.
 * It sits right where the floating emoji rise from, and fades out a few seconds after the last one.
 */
export default function LiveLoveCounter({ love }: { love: LiveLove | null }) {
  return (
    <div className="fixed right-4 bottom-[104px] lg:bottom-[36px] z-[99998] pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {love && (
          <motion.div
            key="live-love"
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass !bg-white/90 rounded-full pl-2 pr-4 py-1.5 flex items-center gap-2.5 shadow-[0_14px_34px_rgba(11,37,69,.16)]"
          >
            <motion.span
              key={love.tick}
              initial={{ scale: 0.6 }}
              animate={{ scale: [0.6, 1.25, 1] }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-8 h-8 grid place-items-center"
            >
              <NotoEmoji emoji={love.emoji} size={28} animated />
            </motion.span>
            <span className="flex flex-col leading-tight">
              {love.total != null ? (
                <>
                  <RollingNumber value={love.total} className="text-[18px] text-ink" />
                  <span className="text-[12px] font-semibold text-ink-3">wishes for you</span>
                </>
              ) : (
                <>
                  <span className="text-[14px] font-bold text-ink">
                    {love.from ?? "Someone"} <span className="text-ink-3 font-semibold">sent love</span>
                  </span>
                  <span className="text-[12px] font-semibold text-ink-3">
                    <RollingNumber value={love.burst} className="text-ink-2" /> just now
                  </span>
                </>
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
