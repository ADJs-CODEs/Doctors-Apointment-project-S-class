"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A general "are you sure?" box. Rendered on <body> so no sidebar or sheet can clip it.
 * Escape or a click outside cancels; the confirm button shows a busy state while onConfirm runs.
 */
export default function ConfirmDialog({
  open,
  icon,
  title,
  body,
  cancelLabel = "Cancel",
  confirmLabel,
  busyLabel = "One moment…",
  danger = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  busyLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="glass !bg-white/90 w-full max-w-sm rounded-[24px] p-6 animate-reveal"
      >
        {icon && (
          <span
            className={`w-12 h-12 mb-4 rounded-xl grid place-items-center border ${
              danger ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-brand-soft text-brand-ink border-[#C4E8E5]"
            }`}
          >
            {icon}
          </span>
        )}
        <p id="confirm-title" className="text-[22px] font-extrabold tracking-[-0.02em] text-ink">
          {title}
        </p>
        {body && <div className="text-[15px] text-ink-3 mt-1">{body}</div>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
          <button ref={cancel} type="button" onClick={onCancel} className="btn btn-glass flex-1 !bg-white">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`btn flex-1 ${
              danger
                ? "text-white border border-rose-700 bg-[linear-gradient(180deg,#F05468,#D62F45)] shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_6px_16px_rgba(214,47,69,.25)]"
                : "btn-ink"
            }`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
