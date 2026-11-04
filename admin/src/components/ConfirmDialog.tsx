"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** A general "are you sure?" box (same look as the logout one). Escape or a click outside cancels. */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "rose",
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "rose" | "teal" | "slate";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const confirmTone = { rose: "bg-rose-600 hover:bg-rose-700 text-white", teal: "btn btn-teal", slate: "btn btn-ink" }[tone];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm" onClick={onCancel}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm surface !bg-white rounded-[24px] shadow-2xl p-6 animate-reveal">
        <p className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">{title}</p>
        {body && <div className="text-[15px] text-ink-2 mt-1.5">{body}</div>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
          <button ref={cancel} onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl border border-line bg-white text-ink-2 text-[15px] font-bold hover:bg-canvas">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={busy} className={`flex-1 px-4 py-3 !rounded-xl text-[15px] font-bold disabled:opacity-50 ${confirmTone}`}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
