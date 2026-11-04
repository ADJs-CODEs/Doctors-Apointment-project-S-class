"use client";

import { RiLogoutCircleRLine } from "@remixicon/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * "Are you sure?" before logging out. Rendered on <body> so the sidebar's scrolling and
 * stacking can't clip it. Escape or a click outside closes it.
 */
export default function ConfirmLogout({
  open,
  onCancel,
  onConfirm,
  who,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** e.g. "the doctor panel" */
  who?: string;
}) {
  const stay = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    stay.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-[28px] shadow-2xl p-6 animate-reveal"
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <RiLogoutCircleRLine size={24} />
        </div>
        <p id="logout-title" className="text-[20px] font-extrabold tracking-[-0.02em] text-ink mt-4">
          Log out{who ? ` of ${who}` : ""}?
        </p>
        <p className="text-sm text-slate-500 mt-1">You&apos;ll need your email and password to get back in.</p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
          <button ref={stay} onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl border border-line bg-white text-ink-2 text-[15px] font-bold hover:bg-canvas">
            Stay logged in
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700">
            Log out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
