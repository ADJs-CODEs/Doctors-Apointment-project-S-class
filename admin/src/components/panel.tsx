"use client";

import { RiArrowRightLine, RiArrowRightSLine } from "@remixicon/react";
import type { ReactNode } from "react";

/**
 * The clinic panel's building blocks, so admin, doctor and pharmacy pages look alike:
 * a page heading, number cards, a titled card, and status pills. Same brand as the patient site.
 */

/** Page title, a line under it, and room for a button on the right. */
export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[30px] sm:text-[36px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink">{title}</h1>
        {subtitle && <p className="text-[15px] text-ink-2 mt-2">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const TONES = {
  brand: "text-brand-ink border-teal-100 bg-[linear-gradient(180deg,#EFFAF9,#D3F0EE)]",
  blue: "text-[#3554C4] border-[#D9E1F7] bg-[#EEF2FC]",
  violet: "text-video border-violet-100 bg-video-soft",
  amber: "text-amber-700 border-amber-100 bg-amber-50",
  rose: "text-rose-600 border-rose-100 bg-rose-50",
} as const;
export type Tone = keyof typeof TONES;

/** A headline number with a label; clickable when it leads somewhere. */
export function StatCard({ icon, value, label, tone = "brand", onClick }: { icon: ReactNode; value: ReactNode; label: string; tone?: Tone; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`surface rounded-[22px] p-5 flex items-center gap-4 text-left w-full ${onClick ? "group transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,37,69,.10)]" : ""}`}
    >
      <span className={`w-12 h-12 shrink-0 rounded-[14px] grid place-items-center border ${TONES[tone]}`}>{icon}</span>
      <span className="min-w-0">
        <span className="num block text-[26px] leading-none text-ink">{value}</span>
        <span className="block text-[14px] font-semibold text-ink-3 mt-1.5">{label}</span>
      </span>
      {onClick && <RiArrowRightLine size={18} className="ml-auto text-ink-3/50 group-hover:text-brand-ink transition-colors" />}
    </Tag>
  );
}

/** A white card with a title row (and an optional link on the right). */
export function Panel({
  title,
  icon,
  action,
  onAction,
  children,
  footer,
  className = "",
}: {
  title?: ReactNode;
  icon?: ReactNode;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface rounded-[24px] overflow-hidden ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-line">
          <h2 className="flex items-center gap-2.5 text-[16px] font-bold text-ink">
            {icon && <span className={`w-8 h-8 rounded-[10px] grid place-items-center border ${TONES.brand}`}>{icon}</span>}
            {title}
          </h2>
          {action && onAction && (
            <button type="button" onClick={onAction} className="flex items-center text-[13px] font-bold text-brand-ink hover:underline">
              {action} <RiArrowRightSLine size={16} />
            </button>
          )}
        </header>
      )}
      {children}
      {footer && <div className="px-5 sm:px-6 py-3.5 border-t border-line bg-canvas/60">{footer}</div>}
    </section>
  );
}

const PILLS = {
  neutral: "bg-canvas text-ink-2 border-line",
  brand: "bg-brand-soft text-brand-ink border-teal-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  violet: "bg-video-soft text-video border-violet-100",
} as const;

/** A small status label: Paid, Cancelled, Completed, Pending… */
export function Pill({ tone = "neutral", children }: { tone?: keyof typeof PILLS; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${PILLS[tone]}`}>{children}</span>;
}

/** Loading placeholder blocks in the brand's line colour. */
export function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[22px] bg-line/70 ${className}`} />;
}
