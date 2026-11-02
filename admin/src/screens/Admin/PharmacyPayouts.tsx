"use client";

import { RiCheckLine, RiCloseLine, RiRefreshLine, RiSendPlaneLine, RiStore2Line } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Payout = {
  _id: string;
  pharmacyName: string;
  cents: number;
  bank: { bankName: string; accountName: string; accountNumber: string; verified: boolean };
  requestedBy?: string;
  status: "pending" | "processing" | "paid" | "rejected" | "failed";
  provider?: "manual" | "paystack";
  payoutMinor?: number;
  reference?: string;
  failureReason?: string;
  adminNote?: string;
  decidedAt?: string;
  createdAt: string;
};

const FILTERS = ["pending", "processing", "paid", "failed", "rejected", "all"] as const;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const TONE: Record<Payout["status"], string> = {
  pending: "bg-orange-50 text-orange-700 border-orange-100",
  processing: "bg-sky-50 text-sky-700 border-sky-100",
  paid: "bg-teal-50 text-teal-700 border-teal-100",
  failed: "bg-red-50 text-red-700 border-red-100",
  rejected: "bg-slate-100 text-slate-500 border-slate-200",
};

/** Pharmacies withdrawing their earnings: send through Paystack, or by hand and record the reference. */
export default function PharmacyPayouts() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [rows, setRows] = useState<Payout[] | null>(null);
  const [paystack, setPaystack] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.PHARMACY_PAYOUTS, { params: filter === "all" ? {} : { status: filter } });
      if (data.success) {
        setRows(data.payouts);
        setPaystack(data.paystack);
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load withdrawals");
    }
  }, [filter]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <p className="text-slate-500 text-sm">
          Pharmacies withdraw what they earned on delivered orders (after your commission), a day after delivery.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize ${filter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {rows === null ? (
        <div className="h-40 rounded-[28px] bg-slate-200/60 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center">
          <p className="font-black text-slate-900">Nothing here</p>
          <p className="text-sm text-slate-400 mt-1">{filter === "pending" ? "No pharmacy withdrawals are waiting." : "No withdrawals with this status."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((p) => (
            <Card key={p._id} p={p} paystack={paystack} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ p, paystack, onChanged }: { p: Payout; paystack: boolean; onChanged: () => void }) {
  const [mode, setMode] = useState<"none" | "pay" | "reject">("none");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const canSend = paystack && p.provider === "paystack";

  const act = async (action: "send" | "paid" | "reject" | "refresh", body: object = {}) => {
    setBusy(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.ADMIN.PHARMACY_PAYOUT(p._id, action), body);
      if (data.success) {
        toast.success(data.message);
        onChanged();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-black text-slate-900">
            {money(p.cents)}
            {p.payoutMinor ? <span className="text-lg font-bold text-slate-400"> · {naira(p.payoutMinor)}</span> : null}
          </p>
          <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-1.5">
            <RiStore2Line size={15} className="text-teal-600" /> {p.pharmacyName}
          </p>
          <p className="text-[12px] text-slate-400">
            Requested {when(p.createdAt)}
            {p.requestedBy ? ` by ${p.requestedBy}` : ""}
          </p>
        </div>
        <span className={`self-start text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${TONE[p.status]}`}>{p.status}</span>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm">
        <p className="font-bold text-slate-800">
          {p.bank.accountName} · {p.bank.bankName} · {p.bank.accountNumber}
        </p>
        <p className={`text-[12px] ${p.bank.verified ? "text-teal-700" : "text-orange-700"}`}>
          {p.bank.verified ? "Confirmed by the bank" : "Typed in by the pharmacy, not confirmed: check it before sending"}
        </p>
      </div>

      {p.status === "processing" ? (
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <p className="text-sm text-sky-700">Sent to Paystack, waiting for the bank.</p>
          <button onClick={() => act("refresh")} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50 disabled:opacity-40">
            <RiRefreshLine size={14} /> Check again
          </button>
        </div>
      ) : p.status !== "pending" ? (
        <p className="text-sm text-slate-500 mt-4">
          {p.status === "paid"
            ? `Paid ${when(p.decidedAt)} · ref ${p.reference}`
            : p.status === "failed"
              ? `Transfer failed ${when(p.decidedAt)}${p.failureReason ? ` (${p.failureReason})` : ""}; it's back in their balance`
              : `Rejected ${when(p.decidedAt)}${p.adminNote ? ` · ${p.adminNote}` : ""}`}
        </p>
      ) : mode === "none" ? (
        <div className="flex flex-wrap gap-2 mt-5">
          {canSend && (
            <button onClick={() => act("send")} disabled={busy} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-40">
              <RiSendPlaneLine size={16} /> Send via Paystack
            </button>
          )}
          <button
            onClick={() => setMode("pay")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold ${canSend ? "border border-slate-200 text-slate-600 hover:bg-slate-50" : "bg-teal-600 text-white hover:bg-teal-700"}`}
          >
            <RiCheckLine size={16} /> I&apos;ve sent it by hand
          </button>
          <button
            onClick={() => setMode("reject")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            <RiCloseLine size={16} /> Reject
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 p-4 space-y-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "pay" ? "Bank transfer reference" : "Reason (sent to the pharmacy)"}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => act(mode === "pay" ? "paid" : "reject", mode === "pay" ? { reference: text } : { adminNote: text })}
              disabled={busy || !text.trim()}
              className={`px-4 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 ${mode === "pay" ? "bg-teal-600" : "bg-red-600"}`}
            >
              {mode === "pay" ? "Mark as paid" : "Reject"}
            </button>
            <button onClick={() => setMode("none")} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
