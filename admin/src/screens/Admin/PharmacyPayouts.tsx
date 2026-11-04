"use client";

import { RiCheckLine, RiCloseLine, RiRefreshLine, RiSendPlaneLine, RiStore2Line } from "@remixicon/react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pill, Skeleton } from "../../components/panel";
import { PAYOUT_STATUS, type PayoutFilter, PayoutFilters } from "./payout-ui";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

export type Payout = {
  _id: string;
  pharmacyName?: string;
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

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const ghost = "flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line bg-white text-ink-2 text-[14px] font-bold hover:bg-canvas";
const teal = "btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl";

/** Pharmacies withdrawing their earnings: send through Paystack, or by hand and record the reference. */
export default function PharmacyPayouts() {
  const [filter, setFilter] = useState<PayoutFilter>("pending");
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
        <p className="text-ink-2 text-[15px]">
          Pharmacies withdraw what they earned on delivered orders (after your commission), a day after delivery.
        </p>
        <PayoutFilters value={filter} onChange={setFilter} />
      </div>

      {rows === null ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <div className="surface rounded-[24px] p-12 text-center">
          <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand-ink mb-4 mx-auto">
            <RiStore2Line size={24} />
          </div>
          <p className="font-bold text-ink">Nothing here</p>
          <p className="text-[14px] text-ink-3 mt-1">{filter === "pending" ? "No pharmacy withdrawals are waiting." : "No withdrawals with this status."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((p) => (
            <PayoutCard key={p._id} p={p} paystack={paystack} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

/** One withdrawal. Shared with doctor withdrawals, which pass their own endpoint and labels. */
export function PayoutCard({
  p,
  paystack,
  onChanged,
  path = API_PATHS.ADMIN.PHARMACY_PAYOUT,
  icon = <RiStore2Line size={15} className="text-brand-ink" />,
  who = "pharmacy",
}: {
  p: Payout & { doctorName?: string };
  paystack: boolean;
  onChanged: () => void;
  path?: (id: string, action: "send" | "paid" | "reject" | "refresh") => string;
  icon?: ReactNode;
  who?: string;
}) {
  const [mode, setMode] = useState<"none" | "pay" | "reject">("none");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const canSend = paystack && p.provider === "paystack";

  const act = async (action: "send" | "paid" | "reject" | "refresh", body: object = {}) => {
    setBusy(true);
    try {
      const { data } = await axiosInstance.post(path(p._id, action), body);
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
    <div className="surface rounded-[22px] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="num text-[30px] leading-none text-ink">
            {money(p.cents)}
            {p.payoutMinor ? <span className="text-[18px] text-ink-3"> · {naira(p.payoutMinor)}</span> : null}
          </p>
          <p className="text-[15px] font-bold text-ink mt-2 flex items-center gap-1.5">
            {icon} {p.pharmacyName ?? p.doctorName}
          </p>
          <p className="text-[13px] text-ink-3">
            Requested {when(p.createdAt)}
            {p.requestedBy ? ` by ${p.requestedBy}` : ""}
          </p>
        </div>
        <span className="self-start">
          <Pill tone={PAYOUT_STATUS[p.status].tone}>{PAYOUT_STATUS[p.status].label}</Pill>
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-canvas px-3 py-2.5 text-[14px]">
        <p className="font-bold text-ink">
          {p.bank.accountName} · {p.bank.bankName} · <span className="num font-normal">{p.bank.accountNumber}</span>
        </p>
        <p className={`text-[13px] ${p.bank.verified ? "text-brand-ink" : "text-orange-700"}`}>
          {p.bank.verified ? "Confirmed by the bank" : `Typed in by the ${who}, not confirmed: check it before sending`}
        </p>
      </div>

      {p.status === "processing" ? (
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <p className="text-[14px] text-video">Sent to Paystack, waiting for the bank.</p>
          <button onClick={() => act("refresh")} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white text-ink-2 text-[13px] font-bold hover:bg-canvas disabled:opacity-40">
            <RiRefreshLine size={14} /> Check again
          </button>
        </div>
      ) : p.status !== "pending" ? (
        <p className="text-[14px] text-ink-3 mt-4">
          {p.status === "paid"
            ? `Paid ${when(p.decidedAt)} · ref ${p.reference}`
            : p.status === "failed"
              ? `Transfer failed ${when(p.decidedAt)}${p.failureReason ? ` (${p.failureReason})` : ""}; it's back in their balance`
              : `Rejected ${when(p.decidedAt)}${p.adminNote ? ` · ${p.adminNote}` : ""}`}
        </p>
      ) : mode === "none" ? (
        <div className="flex flex-wrap gap-2 mt-5">
          {canSend && (
            <button onClick={() => act("send")} disabled={busy} className={`${teal} disabled:opacity-40`}>
              <RiSendPlaneLine size={16} /> Send via Paystack
            </button>
          )}
          <button onClick={() => setMode("pay")} className={canSend ? ghost : teal}>
            <RiCheckLine size={16} /> I&apos;ve sent it by hand
          </button>
          <button onClick={() => setMode("reject")} className={`${ghost} hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200`}>
            <RiCloseLine size={16} /> Reject
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-line bg-canvas/60 p-4 space-y-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "pay" ? "Bank transfer reference" : `Reason (sent to the ${who})`}
            className="field"
          />
          <div className="flex gap-2">
            <button
              onClick={() => act(mode === "pay" ? "paid" : "reject", mode === "pay" ? { reference: text } : { adminNote: text })}
              disabled={busy || !text.trim()}
              className={`disabled:opacity-40 ${mode === "pay" ? teal : "px-4 py-2.5 rounded-xl text-white text-[14px] font-bold bg-rose-600 hover:bg-rose-700"}`}
            >
              {mode === "pay" ? "Mark as paid" : "Reject"}
            </button>
            <button onClick={() => setMode("none")} className="px-4 py-2.5 rounded-xl text-[14px] font-bold text-ink-3 hover:bg-white">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
