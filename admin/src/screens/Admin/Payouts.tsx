"use client";

import {
  RiBankLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiRefreshLine,
  RiSendPlaneLine,
  RiShieldUserLine,
} from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Payout = {
  _id: string;
  userName: string;
  userEmail: string;
  cents: number;
  accountName: string;
  bankName: string;
  accountNumber: string;
  note?: string;
  status: "pending" | "processing" | "paid" | "rejected" | "failed";
  provider?: "manual" | "paystack";
  bankCode?: string;
  resolvedAccountName?: string;
  nameMatches: boolean | null;
  payoutMinor?: number;
  failureReason?: string;
  reference?: string;
  adminNote?: string;
  decidedAt?: string;
  createdAt: string;
};

type Setup = { paystack: boolean; ngnRate: number | null };

const FILTERS = ["pending", "processing", "paid", "failed", "rejected", "all"] as const;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/** Care fund withdrawals: verify the person, send the transfer, then record it here. */
export default function Payouts() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [setup, setSetup] = useState<Setup>({ paystack: false, ngnRate: null });

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.PAYOUTS, {
        params: filter === "all" ? {} : { status: filter },
      });
      if (data.success) {
        setPayouts(data.payouts);
        setSetup({ paystack: data.paystack, ngnRate: data.ngnRate });
      }
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load payouts");
    }
  }, [filter]);

  useEffect(() => {
    setPayouts(null);
    load();
  }, [load]);

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
                <RiBankLine size={20} />
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900">
                Care fund <span className="text-teal-500 font-serif italic">payouts</span>
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">
              {setup.paystack
                ? "Verify the patient, then send it through Paystack. Failed transfers return the money to their fund."
                : "Verify the patient, send the bank transfer, then mark it paid with the reference."}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize ${
                  filter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {payouts === null ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 rounded-[28px] bg-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center">
            <p className="font-black text-slate-900">Nothing here</p>
            <p className="text-sm text-slate-400 mt-1">
              {filter === "pending" ? "No withdrawals are waiting." : "No payouts with this status."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payouts.map((p) => (
              <PayoutCard key={p._id} p={p} setup={setup} onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PayoutCard({ p, setup, onChanged }: { p: Payout; setup: Setup; onChanged: () => void }) {
  const [mode, setMode] = useState<"none" | "send" | "pay" | "reject">("none");
  const [reference, setReference] = useState("");
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Paystack can only send to an account the bank confirmed when the patient asked
  const canSend = setup.paystack && p.provider === "paystack" && !!p.bankCode;
  const kobo = p.payoutMinor ?? (setup.ngnRate ? Math.round(p.cents * setup.ngnRate) : null);

  const call = async (request: Promise<{ data: any }>) => {
    setSaving(true);
    try {
      const { data } = await request;
      if (data.success) {
        toast.success(data.message);
        onChanged();
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const refresh = () => call(axiosInstance.post(API_PATHS.ADMIN.PAYOUT_REFRESH(p._id)));

  const submit = async () => {
    if (mode === "send") {
      return call(axiosInstance.post(API_PATHS.ADMIN.PAYOUT_SEND(p._id), { identityVerified: verified, adminNote: note }));
    }
    setSaving(true);
    try {
      const { data } =
        mode === "pay"
          ? await axiosInstance.post(API_PATHS.ADMIN.PAYOUT_PAID(p._id), {
              reference,
              identityVerified: verified,
              adminNote: note,
            })
          : await axiosInstance.post(API_PATHS.ADMIN.PAYOUT_REJECT(p._id), { adminNote: note });
      if (data.success) {
        toast.success(data.message);
        onChanged();
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const tone = {
    pending: "bg-orange-50 text-orange-700 border-orange-100",
    processing: "bg-sky-50 text-sky-700 border-sky-100",
    paid: "bg-teal-50 text-teal-700 border-teal-100",
    failed: "bg-red-50 text-red-700 border-red-100",
    rejected: "bg-slate-100 text-slate-500 border-slate-200",
  }[p.status];

  return (
    <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-black text-slate-900">
            {money(p.cents)}
            {kobo != null && <span className="text-lg font-bold text-slate-400"> · {naira(kobo)}</span>}
          </p>
          <p className="text-sm font-bold text-slate-700 mt-1">
            {p.userName} <span className="font-medium text-slate-400">· {p.userEmail}</span>
          </p>
          <p className="text-[12px] text-slate-400">Requested {when(p.createdAt)}</p>
        </div>
        <span className={`self-start text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${tone}`}>
          {p.status}
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 mt-4 text-sm">
        {[
          ["Account name", p.accountName],
          ["Bank", p.bankName],
          ["Account number", p.accountNumber],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="font-bold text-slate-800 break-all">{value}</p>
          </div>
        ))}
      </div>
      {p.resolvedAccountName && (
        <p
          className={`flex items-center gap-1.5 text-[12px] font-bold mt-3 ${
            p.nameMatches ? "text-teal-700" : "text-orange-700"
          }`}
        >
          {p.nameMatches ? <RiCheckLine size={15} /> : <RiErrorWarningLine size={15} />}
          {p.nameMatches
            ? "The bank confirmed this account, and the name matches the patient"
            : `The bank says this account belongs to ${p.resolvedAccountName}, which doesn't match ${p.userName}. Check before sending.`}
        </p>
      )}
      {p.note && <p className="text-sm text-slate-500 mt-3 italic">“{p.note}”</p>}

      {p.status === "processing" ? (
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <p className="text-sm text-sky-700">Sent to Paystack, waiting for the bank to confirm.</p>
          <button
            onClick={refresh}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50 disabled:opacity-40"
          >
            <RiRefreshLine size={14} /> {saving ? "Checking…" : "Check again"}
          </button>
        </div>
      ) : p.status !== "pending" ? (
        <p className="text-sm text-slate-500 mt-4">
          {p.status === "paid"
            ? `Paid ${when(p.decidedAt)} · ref ${p.reference}`
            : p.status === "failed"
              ? `Transfer failed ${when(p.decidedAt)}${p.failureReason ? ` (${p.failureReason})` : ""}; the money went back to their fund`
              : `Rejected ${when(p.decidedAt)}`}
          {p.adminNote ? ` · ${p.adminNote}` : ""}
        </p>
      ) : mode === "none" ? (
        <div className="flex flex-wrap gap-2 mt-5">
          {canSend && (
            <button
              onClick={() => setMode("send")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"
            >
              <RiSendPlaneLine size={16} /> Send via Paystack
            </button>
          )}
          <button
            onClick={() => setMode("pay")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold ${
              canSend
                ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
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
          {(mode === "pay" || mode === "send") && (
            <>
              {mode === "pay" ? (
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Bank transfer reference"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
                />
              ) : (
                <p className="text-sm text-slate-600">
                  Paystack will send {kobo != null ? naira(kobo) : money(p.cents)} to {p.resolvedAccountName ?? p.accountName} at{" "}
                  {p.bankName}. This can&apos;t be undone.
                </p>
              )}
              <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-0.5 accent-teal-600" />
                <span className="flex items-center gap-1.5">
                  <RiShieldUserLine size={16} className="text-teal-600" />
                  I&apos;ve verified this is {p.userName} and the account is theirs
                </span>
              </label>
            </>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={mode === "pay" ? "Internal note (optional)" : "Reason (sent to the patient)"}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={
                saving ||
                (mode === "pay" ? !reference.trim() || !verified : mode === "send" ? !verified : !note.trim())
              }
              className={`px-4 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 ${
                mode === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {saving
                ? "Saving…"
                : mode === "send"
                  ? "Send now"
                  : mode === "pay"
                    ? "Mark as paid"
                    : "Reject and return funds"}
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
