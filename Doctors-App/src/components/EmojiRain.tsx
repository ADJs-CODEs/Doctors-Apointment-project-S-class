"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NotoEmoji from "./brand/NotoEmoji";

interface EmojiParticle {
  id: string;
  emoji: string;
  x: number;
  size: number;
  duration: number;
  wobble: number;
}

interface EmojiRainProps {
  particles: EmojiParticle[];
  onComplete: (id: string) => void;
}

function EmojiParticle({
  particle,
  onComplete,
}: {
  particle: EmojiParticle;
  onComplete: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(
      () => onComplete(particle.id),
      particle.duration * 1000 + 200,
    );
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 0,
        x: 0,
        scale: 0.3,
      }}
      animate={{
        opacity: [0, 1, 1, 1, 0],
        y: [0, -80, -200, -350, -500],
        x: [
          0,
          particle.wobble,
          particle.wobble * -0.6,
          particle.wobble * 0.4,
          particle.wobble * -0.2,
        ],
        scale: [0.3, 1, 1, 0.9, 0.7],
      }}
      transition={{
        duration: particle.duration,
        ease: "easeOut",
        times: [0, 0.1, 0.4, 0.7, 1],
      }}
      style={{
        position: "absolute",
        bottom: 0,
        right: particle.x,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <NotoEmoji emoji={particle.emoji} size={Math.round(particle.size * 1.15)} animated />
    </motion.div>
  );
}

/**
 * Where love rises from: the bottom-right corner, just above the live counter (and above the
 * phone tab bar on small screens).
 */
const RAIN_ORIGIN = "fixed right-0 bottom-[156px] lg:bottom-[92px] w-0 h-0 z-[99999] pointer-events-none";

export default function EmojiRain({ particles, onComplete }: EmojiRainProps) {
  return (
    <div className={RAIN_ORIGIN} aria-hidden="true">
      <AnimatePresence>
        {particles.map((p) => (
          <EmojiParticle key={p.id} particle={p} onComplete={onComplete} />
        ))}
      </AnimatePresence>
    </div>
  );
}
