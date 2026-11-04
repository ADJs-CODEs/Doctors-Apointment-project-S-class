"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import NotoEmoji from "@/components/brand/NotoEmoji";

const PLAY_MS = 1500;
const COPIES = 5;

/** A number that rolls to its new value when it changes, and sits still otherwise. */
export function RollingNumber({ value, className = "" }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`num relative inline-flex overflow-hidden tabular-nums ${className}`} aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduce ? false : { y: "70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: "-70%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
          {value.toLocaleString("en-US")}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

type Burst = { id: number; copies: { x: number; y: number; r: number; s: number; d: number }[] };

/** A handful of copies of the emoji floating up from the button and fading out. */
function makeBurst(): Burst {
  return {
    id: Date.now() + Math.random(),
    copies: Array.from({ length: COPIES }, (_, i) => ({
      x: (i - (COPIES - 1) / 2) * 11 + (Math.random() - 0.5) * 14,
      y: -(46 + Math.random() * 34),
      r: (Math.random() - 0.5) * 50,
      s: 0.75 + Math.random() * 0.45,
      d: i * 0.04 + Math.random() * 0.05,
    })),
  };
}

/**
 * One wish: an emoji and how many have been sent. At rest it only stirs now and then (staggered by
 * `index`, so a row takes turns); tapping sends it and a few copies float up from it. It also
 * plays when the count goes up from someone else's wish.
 */
export default function WishButton({
  emoji,
  label,
  count,
  onSend,
  disabled,
  index = 0,
}: {
  emoji: string;
  label: string;
  count?: number;
  onSend: () => void;
  disabled?: boolean;
  /** position in its row, to stagger the resting motion */
  index?: number;
}) {
  const reduce = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastCount = useRef(count);

  const play = () => {
    setPlaying(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPlaying(false), PLAY_MS);
  };

  // someone else's wish arrived (the count went up without a tap here)
  useEffect(() => {
    if (count != null && lastCount.current != null && count > lastCount.current) play();
    lastCount.current = count;
  }, [count]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const send = () => {
    play();
    if (!reduce) {
      const b = makeBurst();
      setBursts((list) => [...list.slice(-3), b]);
      setTimeout(() => setBursts((list) => list.filter((x) => x.id !== b.id)), 1400);
    }
    onSend();
  };

  return (
    <button
      type="button"
      onClick={send}
      disabled={disabled}
      aria-label={`Send ${label.toLowerCase()}${count != null ? ` (${count} sent)` : ""}`}
      title={label}
      // phones: emoji over the number so a row of five fits; wider: a pill
      className={`relative inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-0 sm:h-10 sm:pl-2 sm:pr-3 rounded-[14px] sm:rounded-full border bg-white transition-[border-color,background,transform] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
        playing ? "border-rose-200 bg-rose-50/50" : "border-line hover:border-ink-3/40"
      }`}
    >
      <span className="relative w-6 h-6 grid place-items-center">
        <span className={`inline-block ${playing ? "" : "animate-breathe"}`} style={{ animationDelay: `${index * 1.1}s` }}>
          <NotoEmoji emoji={emoji} size={22} animated={playing} />
        </span>
        {/* the copies that float up on a tap */}
        <span className="absolute left-1/2 top-1/2 pointer-events-none z-20" aria-hidden="true">
          <AnimatePresence>
            {bursts.flatMap((b) =>
              b.copies.map((c, i) => (
                <motion.span
                  key={`${b.id}-${i}`}
                  className="absolute -left-[10px] -top-[10px] w-5 h-5"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], x: c.x, y: c.y, scale: c.s, rotate: c.r }}
                  transition={{ duration: 1.1, delay: c.d, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.15, 0.6, 1] }}
                >
                  <NotoEmoji emoji={emoji} size={20} />
                </motion.span>
              )),
            )}
          </AnimatePresence>
        </span>
      </span>
      {count != null ? (
        <RollingNumber value={count} className="text-[13px] sm:text-[14px] text-ink" />
      ) : (
        <span className="text-[12px] sm:text-[14px] font-semibold text-ink-2">{label}</span>
      )}
    </button>
  );
}
