"use client";

import { RiBankLine, RiCheckboxCircleLine, RiTimeLine, RiWallet3Line } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import { BankForm } from "../Pharmacy/PharmacyEarnings";

type Bank = { bankName: string; bankCode?: string; accountNumber: string; accountName: string; verified: boolean };
type Payout = {
  _id: string;
  cents: number;
  status: "pending" | "processing" | "paid" | "rejected" | "failed";
  reference?: string;
  failureReason?: string;
  adminNote?: string;
  createdAt: string;
};
type Visit = {
  _id: string;
  patientName: string;
  slotDate: string;
  slotTime: string;
  kind: "in-person" | "video";
  noShow: boolean;
  percent: number;
  grossCents: number;
  refundCents: number;
  commissionCents: number;
  doctorCents: number;
  at: string;
  ready: boolean;
};
type Wallet = {
  availableCents: number;
  waitingCents: number;
  inWithdrawalCents: number;
  paidOutCents: number;
  commissionPercent: number;
  minPayoutCents: number;
  holdDays: number;
  bank: Bank | null;
  payouts: Payout[];
  visits: Visit[];
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
// slot dates are stored as "d_m_yyyy"
const slotDay = (s: string) => {
  const [d, m, y] = s.split("_").map(Number);
  return d && m && y ? new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : s;
};
const STATUS: Record<Payout["status"], { label: string; tone: string }> = {
  pending: { label: "Waiting for the clinic", tone: "bg-orange-50 text-orange-700" },
  processing: { label: "Being sent", tone: "bg-sky-50 text-sky-700" },
  paid: { label: "Paid", tone: "bg-teal-50 text-teal-700" },
  rejected: { label: "Not approved", tone: "bg-slate-100 text-slate-500" },
  failed: { label: "Transfer failed", tone: "bg-red-50 text-red-700" },
};

/** The doctor's money page: what visits earned after the clinic's share, and withdrawing it. */
export default function DoctorWallet() {
  const [data, setData] = useState<Wallet | null>(null);
  const [editingBank, setEditingBank] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.DOCTOR.WALLET);
      if (data.success) setData(data);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load your wallet");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const cents = amount ? Math.round(Number(amount) * 100) : undefined;
      const { data } = await axiosInstance.post(API_PATHS.DOCTOR.WALLET_PAYOUTS, { cents });
      if (data.success) {
        toast.success(data.message);
        setAmount("");
        load();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="p-6 md:p-10">
        <div className="h-48 rounded-[28px] bg-slate-200/60 animate-pulse max-w-4xl mx-auto" />
      </div>
    );
  }

  const open = data.payouts.find((p) => p.status === "pending" || p.status === "processing");
  const canWithdraw = !open && !!data.bank && data.availableCents >= data.minPayoutCents;

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
              <RiWallet3Line size={20} />
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900">
              Wallet
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            Paid visits you completed, minus the clinic&apos;s {data.commissionPercent}% share. For a patient no-show you keep the half that
            wasn&apos;t refunded. Money becomes available {data.holdDays} days after the visit.
          </p>
        </div>

        <section className="bg-slate-900 text-white rounded-[28px] p-6 sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[2px] text-teal-300">Available to withdraw</p>
          <p className="text-5xl font-black mt-2 tabular-nums">{money(data.availableCents)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 text-sm">
            {[
              [`Waiting (last ${data.holdDays} days)`, data.waitingCents],
              ["Being withdrawn", data.inWithdrawalCents],
              ["Paid out so far", data.paidOutCents],
            ].map(([label, cents]) => (
              <div key={label as string} className="rounded-2xl bg-white/5 px-3 py-2.5">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="font-black tabular-nums">{money(cents as number)}</p>
              </div>
            ))}
          </div>

          {open ? (
            <p className="mt-5 flex items-center gap-2 text-sm font-bold text-sky-200 bg-white/5 rounded-2xl px-4 py-3">
              <RiTimeLine size={18} /> {money(open.cents)} withdrawal {open.status === "processing" ? "is being sent" : "is waiting for the clinic"}
            </p>
          ) : (
            <form onSubmit={withdraw} className="mt-5 flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                min={data.minPayoutCents / 100}
                max={data.availableCents / 100}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`All of it (${money(data.availableCents)})`}
                disabled={!canWithdraw}
                className="flex-1 rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-teal-400 disabled:opacity-40"
              />
              <button type="submit" disabled={!canWithdraw || busy} className="px-6 py-3 rounded-2xl bg-teal-500 text-slate-900 font-black hover:bg-teal-400 disabled:opacity-40">
                {busy ? "Requesting…" : "Withdraw"}
              </button>
            </form>
          )}
          {!open && !canWithdraw && (
            <p className="text-[12px] text-slate-400 mt-2">
              {!data.bank ? "Add your bank account below first." : `You can withdraw from ${money(data.minPayoutCents)}.`}
            </p>
          )}
        </section>

        <section className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-slate-900 flex items-center gap-2">
              <RiBankLine size={18} className="text-teal-600" /> Bank account
            </p>
            {data.bank && !editingBank && (
              <button onClick={() => setEditingBank(true)} className="text-[12px] font-bold text-teal-700 hover:underline">
                Change
              </button>
            )}
          </div>
          {data.bank && !editingBank ? (
            <div className="mt-3 text-sm">
              <p className="font-bold text-slate-900">{data.bank.accountName}</p>
              <p className="text-slate-500">
                {data.bank.bankName} · {data.bank.accountNumber}
              </p>
              <p className={`mt-1 text-[12px] flex items-center gap-1 ${data.bank.verified ? "text-teal-700" : "text-slate-400"}`}>
                {data.bank.verified ? (
                  <>
                    <RiCheckboxCircleLine size={14} /> Confirmed by the bank: withdrawals can be sent automatically
                  </>
                ) : (
                  "Typed in: the clinic sends these by hand"
                )}
              </p>
            </div>
          ) : (
            <BankForm
              banksPath={API_PATHS.DOCTOR.WALLET_BANKS}
              savePath={API_PATHS.DOCTOR.WALLET_BANK}
              onSaved={() => {
                setEditingBank(false);
                load();
              }}
              onCancel={data.bank ? () => setEditingBank(false) : undefined}
            />
          )}
        </section>

        <section className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6">
          <p className="font-black text-slate-900 mb-3">Withdrawals</p>
          {data.payouts.length === 0 ? (
            <p className="text-sm text-slate-400">None yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.payouts.map((p) => (
                <li key={p._id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-900 tabular-nums">{money(p.cents)}</p>
                    <p className="text-[12px] text-slate-500">
                      {when(p.createdAt)}
                      {p.status === "paid" && p.reference ? ` · ref ${p.reference}` : ""}
                      {p.failureReason ? ` · ${p.failureReason}` : ""}
                      {p.status === "rejected" && p.adminNote ? ` · ${p.adminNote}` : ""}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS[p.status].tone}`}>{STATUS[p.status].label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6">
          <p className="font-black text-slate-900 mb-3">What each visit earned</p>
          {data.visits.length === 0 ? (
            <p className="text-sm text-slate-400">Your earnings appear here once you complete paid visits.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="text-left font-bold py-2">Visit</th>
                    <th className="text-left font-bold py-2">Patient</th>
                    <th className="text-right font-bold py-2">Fee</th>
                    <th className="text-right font-bold py-2 hidden sm:table-cell">Deducted</th>
                    <th className="text-right font-bold py-2">You earn</th>
                  </tr>
                </thead>
                <tbody>
                  {data.visits.map((v) => (
                    <tr key={v._id} className="border-t border-slate-100 align-top">
                      <td className="py-2.5 text-slate-600">
                        {slotDay(v.slotDate)}
                        <span className="block text-[11px] text-slate-400">
                          {v.kind === "video" ? "Video" : "In person"}
                          {v.noShow ? " · patient no-show" : ""}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-800">{v.patientName}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{money(v.grossCents)}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-500 hidden sm:table-cell">
                        {v.refundCents ? <span className="block">−{money(v.refundCents)} refund</span> : null}
                        {v.commissionCents ? `−${money(v.commissionCents)} (${v.percent}%)` : v.refundCents ? null : "None"}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-black text-slate-900">
                        {money(v.doctorCents)}
                        {!v.ready && <span className="block text-[10px] font-bold text-slate-400">available soon</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
