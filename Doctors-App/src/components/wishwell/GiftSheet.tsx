"use client";

import { RiCloseLine, RiCoinsLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useEmoji } from "@/Context/EmojiContext";
import { Link } from "@/lib/navigation";
import type { Gift, WalletOverview } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

const TIER_LABEL: Record<Gift["tier"], string | null> = {
  small: null,
  banner: "On the banner",
  fullscreen: "Full screen",
};

/** Pick a paid gift for a Wish Well patient and send it with coins. */
export default function GiftSheet({
  entry,
  onClose,
  onSent,
}: {
  entry: { _id: string; patientName: string } | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { addEmoji } = useEmoji();
  const [wallet, setWallet] = useState<Pick<WalletOverview, "coins" | "gifts" | "feePercent"> | null>(null);
  const [selected, setSelected] = useState<Gift | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setSelected(null);
    setMessage("");
    axiosInstance
      .get(API_PATHS.WALLET.OVERVIEW)
      .then(({ data }) => data.success && setWallet(data))
      .catch(() => toast.error("Couldn't load your wallet"));
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  const short = !!selected && !!wallet && wallet.coins < selected.coins;

  const send = async () => {
    if (!entry || !selected || short) return;
    setSending(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.WALLET.GIFT, {
        entryId: entry._id,
        giftId: selected.id,
        anonymous,
        message,
      });
      if (data.success) {
        // big gifts get the full celebration from the server for everyone; small ones float up here
        if (selected.tier === "small") addEmoji(selected.emoji, 4);
        toast.success(data.message);
        onSent();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gift not sent");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-white rounded-t-[32px] sm:rounded-[28px] shadow-2xl p-5 sm:p-6 max-h-[92dvh] overflow-y-auto"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">Send a gift to {entry.patientName}</h2>
                <p className="text-sm text-slate-500">
                  {wallet ? `${100 - wallet.feePercent}% of its value goes to their care fund.` : " "}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close">
                <RiCloseLine size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between mt-4 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-sm font-black text-amber-700">
                <RiCoinsLine size={18} /> {wallet ? wallet.coins.toLocaleString("en-US") : "…"} coins
              </span>
              <Link to="/wallet" className="text-[12px] font-bold text-amber-700 underline underline-offset-2">
                Top up
              </Link>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
              {(wallet?.gifts ?? []).map((g) => {
                const active = selected?.id === g.id;
                const tierLabel = TIER_LABEL[g.tier];
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelected(g)}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl border p-2.5 transition-all ${
                      active
                        ? "border-rose-400 bg-rose-50 ring-2 ring-rose-200 scale-[1.03]"
                        : "border-slate-200 hover:border-rose-200 hover:bg-rose-50/40"
                    }`}
                  >
                    {tierLabel && (
                      <span
                        className={`absolute -top-2 text-[8px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5 text-white ${
                          g.tier === "fullscreen" ? "bg-violet-500" : "bg-rose-500"
                        }`}
                      >
                        {tierLabel}
                      </span>
                    )}
                    <span className="text-3xl leading-none mt-1">{g.emoji}</span>
                    <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{g.name}</span>
                    <span className="flex items-center gap-0.5 text-[11px] font-black text-amber-600">
                      <RiCoinsLine size={12} /> {g.coins.toLocaleString("en-US")}
                    </span>
                  </button>
                );
              })}
            </div>

            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              placeholder="Add a short message (optional)"
              className="w-full mt-4 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
            <label className="flex items-center gap-2 mt-3 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-rose-500" />
              Send anonymously (shows as &ldquo;Someone&rdquo;)
            </label>

            {short ? (
              <Link
                to="/wallet"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600"
              >
                <RiCoinsLine size={18} /> You need {(selected!.coins - (wallet?.coins ?? 0)).toLocaleString("en-US")} more coins.
                Top up
              </Link>
            ) : (
              <button
                onClick={send}
                disabled={!selected || sending}
                className="mt-4 w-full py-3.5 rounded-2xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-40 transition-colors"
              >
                {sending
                  ? "Sending…"
                  : selected
                    ? `Send ${selected.emoji} ${selected.name} for ${selected.coins.toLocaleString("en-US")} coins`
                    : "Pick a gift"}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
