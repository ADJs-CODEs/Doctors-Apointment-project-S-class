"use client";

import { useEffect, useRef } from "react";

/**
 * The Wish Well as a night sky: every wish ever sent is one small warm light. When a new wish
 * arrives (`bursts` goes up: a tap here, or someone else's arriving live) a lantern rises from
 * the bottom with a soft trail and settles in as a new star. Drawn on a 2D canvas; with reduced
 * motion the sky is still and nothing rises.
 */

type Star = { x: number; y: number; r: number; tone: number; phase: number; speed: number };
type Lantern = { x: number; y: number; vx: number; ty: number; tone: number; age: number; trail: { x: number; y: number }[] };

// warm white, soft gold, soft rose: the only colours in the sky
const TONES = ["255,246,232", "255,214,150", "255,176,193"];
const MAX_STARS = 320;

// the same wish count always draws the same sky
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const makeStar = (rand: () => number, w: number, h: number): Star => ({
  x: rand() * w,
  y: Math.pow(rand(), 0.8) * h * 0.92, // thicker towards the top, like a real night sky
  r: 0.45 + Math.pow(rand(), 3) * 1.5,
  // mostly soft warm white; a little gold, very little rose: quiet, not festive
  tone: rand() < 0.84 ? 0 : rand() < 0.75 ? 1 : 2,
  phase: rand() * Math.PI * 2,
  speed: 0.2 + rand() * 0.45,
});

export default function WishSky({
  count,
  bursts = 0,
  burstX,
  seed = 7,
  className = "",
}: {
  /** how many wishes so far: one light each (capped so the sky stays readable) */
  count: number;
  /** goes up by one per new wish; each step launches a lantern */
  bursts?: number;
  /** where lanterns start, 0..1 across (default: somewhere near the middle) */
  burstX?: number;
  seed?: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stars = useRef<Star[]>([]);
  const lanterns = useRef<Lantern[]>([]);
  const size = useRef({ w: 1, h: 1 });
  const lastBursts = useRef(bursts);
  const reduce = useRef(false);
  // asks for one more frame (the loop stops when nothing moves, e.g. with reduced motion)
  const kick = useRef<() => void>(() => {});

  // the star field follows the count; new stars are added, never reshuffled
  useEffect(() => {
    const { w, h } = size.current;
    const want = Math.min(count, MAX_STARS);
    const rand = seeded(seed * 7919 + stars.current.length + 1);
    while (stars.current.length < want) stars.current.push(makeStar(rand, w, h));
    if (stars.current.length > want) stars.current.length = want;
    kick.current();
  }, [count, seed]);

  // a new wish: a lantern rises (it becomes one of the stars above)
  useEffect(() => {
    const added = Math.min(6, bursts - lastBursts.current);
    lastBursts.current = bursts;
    if (added <= 0 || reduce.current) return;
    const { w, h } = size.current;
    for (let i = 0; i < added; i++) {
      const startX = (burstX ?? 0.35 + Math.random() * 0.3) * w + (Math.random() - 0.5) * 30;
      lanterns.current.push({
        x: startX,
        y: h + 8 + i * 22,
        vx: (Math.random() - 0.5) * 0.5,
        ty: h * (0.08 + Math.random() * 0.45),
        tone: Math.random() < 0.8 ? 1 : 0,
        age: 0,
        trail: [],
      });
    }
    kick.current();
  }, [bursts, burstX]);

  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    reduce.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;

    const fit = () => {
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const old = size.current;
      el.width = Math.max(1, Math.round(rect.width * dpr));
      el.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // keep the stars where they were, stretched to the new size
      const sx = rect.width / old.w, sy = rect.height / old.h;
      if (old.w > 1) stars.current.forEach((s) => ((s.x *= sx), (s.y *= sy)));
      size.current = { w: rect.width, h: rect.height };
      if (old.w <= 1) {
        const rand = seeded(seed * 7919 + 1);
        stars.current = Array.from({ length: stars.current.length }, () => makeStar(rand, rect.width, rect.height));
      }
      kick.current();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    // stop drawing when it's off screen
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    });
    io.observe(el);

    const glow = (x: number, y: number, r: number, tone: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${tone},${a})`);
      g.addColorStop(1, `rgba(${tone},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = (now: number) => {
      raf = 0;
      const { w, h } = size.current;
      const t = reduce.current ? 0 : now / 1000;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars.current) {
        // a slow, shallow twinkle: the lights breathe rather than sparkle
        const tw = reduce.current ? 0.75 : 0.72 + 0.28 * Math.sin(t * s.speed + s.phase);
        const tone = TONES[s.tone];
        if (s.r > 1.4) glow(s.x, s.y, s.r * 4.5, tone, 0.12 * tw);
        ctx.fillStyle = `rgba(${tone},${0.3 + 0.5 * tw})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // lanterns rise, slow down near their spot, and settle in as stars
      lanterns.current = lanterns.current.filter((l) => {
        l.age += 1;
        const dist = l.y - l.ty;
        l.y -= Math.max(0.6, dist * 0.028);
        l.x += l.vx + Math.sin(l.age / 18) * 0.25;
        l.trail.push({ x: l.x, y: l.y });
        if (l.trail.length > 26) l.trail.shift();
        const tone = TONES[l.tone];
        l.trail.forEach((p, i) => {
          const a = (i / l.trail.length) * 0.35;
          ctx.fillStyle = `rgba(${tone},${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.4 * (i / l.trail.length) + 0.3, 0, Math.PI * 2);
          ctx.fill();
        });
        glow(l.x, l.y, 18, tone, 0.55);
        ctx.fillStyle = `rgba(255,250,240,0.95)`;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        if (dist < 1.5) {
          stars.current.push({ x: l.x, y: l.y, r: 1.6, tone: l.tone, phase: 0, speed: 0.9 });
          if (stars.current.length > MAX_STARS) stars.current.shift();
          return false;
        }
        return true;
      });

      if (visible && (!reduce.current || lanterns.current.length)) raf = requestAnimationFrame(draw);
    };
    kick.current = () => {
      if (!raf && visible) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [seed]);

  return <canvas ref={canvas} aria-hidden="true" className={`block w-full h-full ${className}`} />;
}
