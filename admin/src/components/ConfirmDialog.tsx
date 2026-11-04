"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** A general "are you sure?" box (same look as the logout one). Escape or a click outside cancels. */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = "rose",
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
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
  const confirmTone = { rose: "bg-rose-600 hover:bg-rose-700", teal: "bg-teal-600 hover:bg-teal-700", slate: "bg-slate-800 hover:bg-slate-900" }[tone];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-[28px] shadow-2xl p-6 animate-reveal">
        <p className="text-xl font-black text-slate-900">{title}</p>
        {body && <div className="text-sm text-slate-500 mt-1">{body}</div>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
          <button ref={cancel} onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy} className={`flex-1 px-4 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 ${confirmTone}`}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
