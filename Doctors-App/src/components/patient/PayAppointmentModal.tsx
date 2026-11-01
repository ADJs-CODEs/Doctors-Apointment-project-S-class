"use client";

import { RiBankCardLine, RiCloseLine, RiCoinsLine, RiHandHeartLine, RiWallet3Line } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";
import { useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppContext } from "@/Context/AppContext";
import { Link } from "@/lib/navigation";
import type { AppContextType, Appointment } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

/**
 * How to pay for an appointment: from the wallet (care fund first, then coins, 1 coin =
 * 1 cent) or by card through Stripe.
 */
export default function PayAppointmentModal({
  appointment,
  onClose,
  onPaid,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { currencySymbol } = useContext(AppContext) as AppContextType;
  const [wallet, setWallet] = useState<{ coins: number; fundCents: number } | null>(null);
  const [busy, setBusy] = useState<"wallet" | "card" | null>(null);

  useEffect(() => {
    if (!appointment) return;
    setWallet(null);
    axiosInstance
      .get(API_PATHS.WALLET.OVERVIEW, { silent: true } as any)
      .then(({ data }) => data.success && setWallet({ coins: data.coins, fundCents: data.fundCents }))
      .catch(() => setWallet({ coins: 0, fundCents: 0 }));
  }, [appointment]);

  useEffect(() => {
    if (!appointment) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appointment, onClose]);

  const money = (cents: number) => `${currencySymbol}${(cents / 100).toFixed(2)}`;
  const cost = appointment ? Math.round(appointment.amount * 100) : 0;
  // same split the server uses: care fund first, then coins
  const fromFund = Math.min(wallet?.fundCents ?? 0, cost);
  const fromCoins = cost - fromFund;
  const enough = !!wallet && wallet.coins >= fromCoins;
  const shortBy = wallet ? fromCoins - wallet.coins : 0;

  const payWallet = async () => {
    if (!appointment) return;
    setBusy("wallet");
    try {
      const { data } = await axiosInstance.post(API_PATHS.WALLET.PAY_APPOINTMENT, { appointmentId: appointment._id });
      if (data.success) {
        toast.success(data.message);
        onPaid();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setBusy(null);
    }
  };

  const payCard = async () => {
    if (!appointment) return;
    setBusy("card");
    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.STRIPE_AUTH, { appointmentId: appointment._id });
      if (data.success) window.location.assign(data.session_url);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AnimatePresence>
      {appointment && (
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
            className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-[28px] shadow-2xl p-6"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">Pay for your appointment</h2>
                <p className="text-sm text-slate-500">
                  {appointment.docData?.name} · {appointment.slotDate.replace(/_/g, "/")} at {appointment.slotTime}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close">
                <RiCloseLine size={20} />
              </button>
            </div>

            <p className="text-4xl font-black text-slate-900 mt-4">{money(cost)}</p>

            {/* wallet */}
            <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
              <p className="flex items-center gap-2 font-black text-slate-900">
                <RiWallet3Line size={18} className="text-teal-600" /> Pay from wallet
              </p>
              {!wallet ? (
                <div className="h-10 mt-3 rounded-xl bg-slate-200/60 animate-pulse" />
              ) : (
                <>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {fromFund > 0 && (
                      <li className="flex justify-between">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <RiHandHeartLine size={15} className="text-teal-600" /> Care fund
                        </span>
                        <span className="font-bold text-slate-900">{money(fromFund)}</span>
                      </li>
                    )}
                    {fromCoins > 0 && (
                      <li className="flex justify-between">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <RiCoinsLine size={15} className="text-amber-500" /> Coins
                        </span>
                        <span className={`font-bold ${enough ? "text-slate-900" : "text-red-600"}`}>
                          {fromCoins.toLocaleString("en-US")} of {wallet.coins.toLocaleString("en-US")}
                        </span>
                      </li>
                    )}
                  </ul>
                  {enough ? (
                    <button
                      onClick={payWallet}
                      disabled={!!busy}
                      className="mt-4 w-full py-3 rounded-2xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60 transition-colors"
                    >
                      {busy === "wallet" ? "Paying…" : `Pay ${money(cost)} from wallet`}
                    </button>
                  ) : (
                    <Link
                      to="/wallet"
                      className="mt-4 w-full inline-flex justify-center items-center gap-2 py-3 rounded-2xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600"
                    >
                      <RiCoinsLine size={16} /> Top up {shortBy.toLocaleString("en-US")} more coins
                    </Link>
                  )}
                  <p className="text-[11px] text-slate-500 mt-2">
                    Uses your care fund first, then coins (1 coin = {currencySymbol}0.01). If it&apos;s cancelled, the money
                    goes straight back to your wallet.
                  </p>
                </>
              )}
            </div>

            {/* card */}
            <button
              onClick={payCard}
              disabled={!!busy}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-60"
            >
              <RiBankCardLine size={18} /> {busy === "card" ? "Opening checkout…" : "Pay with card instead"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
