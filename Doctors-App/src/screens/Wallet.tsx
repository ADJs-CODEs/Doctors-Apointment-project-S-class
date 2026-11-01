"use client";

import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiBankLine,
  RiCloseLine,
  RiCoinsLine,
  RiGiftLine,
  RiHandHeartLine,
  RiStethoscopeLine,
  RiTimeLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";
import { type FormEvent, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppContext } from "@/Context/AppContext";
import { Link, useNavigate, useSearchParams } from "@/lib/navigation";
import type { AppContextType, CoinPack, WalletOverview, WalletTransaction } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

const coinsText = (n: number) => n.toLocaleString("en-US");

/** "$12.00 fund + 300 coins" for entries that touch both balances. */
const walletAmount = (tx: WalletTransaction, money: (cents: number) => string) =>
  [tx.cents && `${money(Math.abs(tx.cents))} fund`, tx.coins && `${coinsText(Math.abs(tx.coins))} coins`]
    .filter(Boolean)
    .join(" + ") || "0";

function TxRow({ tx, money }: { tx: WalletTransaction; money: (cents: number) => string }) {
  const map: Record<WalletTransaction["kind"], { label: string; icon: React.ReactNode; tone: string; amount: string }> = {
    topup: { label: "Bought coins", icon: <RiCoinsLine size={16} />, tone: "bg-amber-50 text-amber-600", amount: `+${coinsText(tx.coins)} coins` },
    gift_sent: {
      label: `Gift to ${tx.counterpartyName ?? "a patient"}`,
      icon: <RiGiftLine size={16} />,
      tone: "bg-rose-50 text-rose-500",
      amount: `${coinsText(tx.coins)} coins`,
    },
    gift_received: {
      label: `Gift from ${tx.counterpartyName ?? "someone"}`,
      icon: <RiHandHeartLine size={16} />,
      tone: "bg-teal-50 text-teal-600",
      amount: `+${money(tx.cents)}`,
    },
    payout_requested: { label: "Withdrawal", icon: <RiArrowUpLine size={16} />, tone: "bg-slate-100 text-slate-600", amount: money(tx.cents) },
    payout_returned: { label: "Withdrawal returned", icon: <RiArrowDownLine size={16} />, tone: "bg-orange-50 text-orange-600", amount: `+${money(tx.cents)}` },
    appointment_payment: {
      label: `Appointment with ${tx.counterpartyName ?? "your doctor"}`,
      icon: <RiStethoscopeLine size={16} />,
      tone: "bg-blue-50 text-blue-600",
      amount: walletAmount(tx, money),
    },
    appointment_refund: {
      label: `Refund: ${tx.counterpartyName ?? "appointment"}`,
      icon: <RiArrowDownLine size={16} />,
      tone: "bg-teal-50 text-teal-600",
      amount: `+${walletAmount(tx, money)}`,
    },
  };
  const row = map[tx.kind];
  const positive = row.amount.startsWith("+");
  return (
    <li className="flex items-center gap-3 py-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${row.tone}`}>{row.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800 truncate">{row.label}</p>
        <p className="text-[11px] text-slate-400">
          {new Date(tx.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
      <p className={`text-sm font-black shrink-0 ${positive ? "text-teal-600" : "text-slate-700"}`}>{row.amount}</p>
    </li>
  );
}

export default function Wallet() {
  const { currencySymbol } = useContext(AppContext) as AppContextType;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<WalletOverview | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const verified = useRef(false);

  const money = useCallback((cents: number) => `${currencySymbol}${(cents / 100).toFixed(2)}`, [currencySymbol]);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.WALLET.OVERVIEW);
      if (data.success) setData(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load your wallet");
    }
  }, []);

  // back from Stripe: credit the coins (once; safe if the page is refreshed)
  useEffect(() => {
    const status = params.get("topup");
    const sessionId = params.get("session_id");
    if (status === "cancelled") {
      toast.message("Top-up cancelled. No money was taken.");
      navigate("/wallet", { replace: true });
    } else if (status === "success" && sessionId && !verified.current) {
      verified.current = true;
      axiosInstance
        .post(API_PATHS.WALLET.VERIFY_TOPUP, { session_id: sessionId })
        .then(({ data }) => (data.success ? toast.success(data.message) : toast.error(data.message)))
        .catch((err) => toast.error(err.response?.data?.message || "Couldn't confirm the payment"))
        .finally(() => {
          navigate("/wallet", { replace: true });
          load();
        });
      return;
    }
    load();
  }, [params, navigate, load]);

  const buy = async (pack: CoinPack) => {
    setBuying(pack.id);
    try {
      const { data } = await axiosInstance.post(API_PATHS.WALLET.TOPUP, { packId: pack.id });
      if (data.success) window.location.assign(data.session_url);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't start the payment");
    } finally {
      setBuying(null);
    }
  };

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto py-6 space-y-6">
        {[28, 44, 60].map((h, i) => (
          <div key={i} className="animate-pulse rounded-[28px] bg-slate-200/60" style={{ height: h * 4 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Wallet</h1>
          <p className="text-slate-500 mt-1">Coins for Wish Well gifts{data.hasCareFund ? ", and your care fund" : ""}.</p>
        </div>
        <Link
          to="/wish-well"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-[12px] font-black uppercase tracking-wider hover:bg-teal-600 transition-colors"
        >
          <RiGiftLine size={18} /> Send a gift
        </Link>
      </div>

      <div className={`grid gap-6 ${data.hasCareFund ? "lg:grid-cols-2" : ""}`}>
        {/* coins */}
        <section className="rounded-[28px] p-6 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white shadow-lg shadow-orange-200">
          <p className="text-[11px] font-black uppercase tracking-[2px] text-white/80">Your coins</p>
          <p className="text-5xl font-black mt-2 flex items-center gap-3">
            <RiCoinsLine size={40} /> {coinsText(data.coins)}
          </p>
          <p className="text-sm text-white/85 mt-1">
            1 coin = {currencySymbol}0.01 · {100 - data.feePercent}% of every gift goes to the patient&apos;s care fund
          </p>
        </section>

        {/* care fund */}
        {data.hasCareFund && (
          <section className="rounded-[28px] p-6 bg-white border border-teal-100 shadow-clinical">
            <p className="text-[11px] font-black uppercase tracking-[2px] text-teal-700">Your care fund</p>
            <p className="text-5xl font-black text-slate-900 mt-2">{money(data.fundCents)}</p>
            <p className="text-sm text-slate-500 mt-1">
              {money(data.fundLifetimeCents)} raised by the community so far
            </p>
            {data.pendingPayout ? (
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-orange-700 bg-orange-50 rounded-2xl px-4 py-3">
                <RiTimeLine size={18} /> {money(data.pendingPayout.cents)} withdrawal waiting for approval
              </p>
            ) : (
              <button
                onClick={() => setWithdrawing(true)}
                disabled={data.fundCents < data.minPayoutCents}
                className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={data.fundCents < data.minPayoutCents ? `You can withdraw from ${money(data.minPayoutCents)}` : undefined}
              >
                <RiBankLine size={18} /> Withdraw to my bank
              </button>
            )}
          </section>
        )}
      </div>

      {/* coin packs */}
      <section className="bg-white rounded-[28px] border border-slate-100 shadow-clinical p-5 sm:p-6">
        <h2 className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 mb-4">Top up</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.packs.map((pack) => (
            <button
              key={pack.id}
              onClick={() => buy(pack)}
              disabled={!!buying}
              className="relative rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 p-4 text-left transition-colors disabled:opacity-60"
            >
              {pack.bonus ? (
                <span className="absolute -top-2 right-3 text-[10px] font-black text-white bg-rose-500 rounded-full px-2 py-0.5">
                  +{coinsText(pack.bonus)} bonus
                </span>
              ) : null}
              <p className="flex items-center gap-1.5 text-lg font-black text-slate-900">
                <RiCoinsLine size={18} className="text-amber-500" /> {coinsText(pack.coins)}
              </p>
              <p className="text-sm font-bold text-slate-500 mt-1">
                {buying === pack.id ? "Opening checkout…" : money(pack.cents)}
              </p>
            </button>
          ))}
        </div>
        <p className="text-[12px] text-slate-400 mt-3">
          Paid securely with Stripe. You must be 18 or over to buy coins. Coins can&apos;t be cashed out; they&apos;re for
          gifts.
        </p>
      </section>

      {/* history */}
      <section className="bg-white rounded-[28px] border border-slate-100 shadow-clinical p-5 sm:p-6">
        <h2 className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 mb-2">History</h2>
        {data.transactions.length ? (
          <ul className="divide-y divide-slate-100">
            {data.transactions.map((tx) => (
              <TxRow key={tx._id} tx={tx} money={money} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400 py-4">Nothing yet. Top up and send your first gift.</p>
        )}
      </section>

      <WithdrawModal
        open={withdrawing}
        available={data.fundCents}
        minimum={data.minPayoutCents}
        money={money}
        onClose={() => setWithdrawing(false)}
        onDone={load}
      />
    </div>
  );
}

function WithdrawModal({
  open,
  available,
  minimum,
  money,
  onClose,
  onDone,
}: {
  open: boolean;
  available: number;
  minimum: number;
  money: (cents: number) => string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ amount: "", accountName: "", bankName: "", accountNumber: "", note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, amount: (available / 100).toFixed(2) }));
  }, [open, available]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.WALLET.PAYOUT, {
        cents: Math.round(Number(form.amount) * 100),
        accountName: form.accountName,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        note: form.note,
      });
      if (data.success) {
        toast.success(data.message);
        onDone();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't request the withdrawal");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-[28px] shadow-2xl p-6 sm:p-7 space-y-3"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Withdraw your care fund</h2>
                <p className="text-sm text-slate-500">{money(available)} available</p>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <RiCloseLine size={20} />
              </button>
            </div>
            <label className="block">
              <span className="text-[12px] font-bold text-slate-600">Amount</span>
              <input
                type="number"
                min={minimum / 100}
                max={available / 100}
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={field}
              />
            </label>
            <input required placeholder="Account holder name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className={field} />
            <input required placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={field} />
            <input required placeholder="Account number" inputMode="numeric" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className={field} />
            <textarea placeholder="Note for the clinic (optional)" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={`${field} resize-none`} />
            <p className="text-[12px] text-slate-500 bg-slate-50 rounded-2xl px-4 py-3">
              The clinic will confirm it&apos;s really you before sending the money, then email you the transfer reference.
              The amount is held from your fund until then.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? "Sending request…" : "Request withdrawal"}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
