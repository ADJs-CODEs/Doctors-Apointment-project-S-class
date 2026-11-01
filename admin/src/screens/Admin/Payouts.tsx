"use client";

import { RiBankLine, RiCheckLine, RiCloseLine, RiShieldUserLine } from "@remixicon/react";
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
  status: "pending" | "paid" | "rejected";
  reference?: string;
  adminNote?: string;
  decidedAt?: string;
  createdAt: string;
};

const FILTERS = ["pending", "paid", "rejected", "all"] as const;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/** Care fund withdrawals: verify the person, send the transfer, then record it here. */
export default function Payouts() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [payouts, setPayouts] = useState<Payout[] | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.PAYOUTS, {
        params: filter === "all" ? {} : { status: filter },
      });
      if (data.success) setPayouts(data.payouts);
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
              Verify the patient, send the bank transfer, then mark it paid with the reference.
            </p>
          </div>
          <div className="flex gap-1.5">
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
              <PayoutCard key={p._id} p={p} onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PayoutCard({ p, onChanged }: { p: Payout; onChanged: () => void }) {
  const [mode, setMode] = useState<"none" | "pay" | "reject">("none");
  const [reference, setReference] = useState("");
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
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

  const tone =
    p.status === "pending"
      ? "bg-orange-50 text-orange-700 border-orange-100"
      : p.status === "paid"
        ? "bg-teal-50 text-teal-700 border-teal-100"
        : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-black text-slate-900">{money(p.cents)}</p>
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
      {p.note && <p className="text-sm text-slate-500 mt-3 italic">“{p.note}”</p>}

      {p.status !== "pending" ? (
        <p className="text-sm text-slate-500 mt-4">
          {p.status === "paid" ? `Paid ${when(p.decidedAt)} · ref ${p.reference}` : `Rejected ${when(p.decidedAt)}`}
          {p.adminNote ? ` · ${p.adminNote}` : ""}
        </p>
      ) : mode === "none" ? (
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setMode("pay")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"
          >
            <RiCheckLine size={16} /> I&apos;ve sent it
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
          {mode === "pay" && (
            <>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Bank transfer reference"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
              />
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
              disabled={saving || (mode === "pay" ? !reference.trim() || !verified : !note.trim())}
              className={`px-4 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 ${
                mode === "pay" ? "bg-teal-600 hover:bg-teal-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {saving ? "Saving…" : mode === "pay" ? "Mark as paid" : "Reject and return funds"}
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
