"use client";

import { RiBankLine, RiCheckboxCircleLine, RiMoneyDollarCircleLine, RiTimeLine } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Bank = { bankName: string; bankCode?: string; accountNumber: string; accountName: string; verified: boolean };
type Payout = {
  _id: string;
  cents: number;
  bank: { bankName: string; accountName: string; accountNumber: string };
  requestedBy?: string;
  status: "pending" | "processing" | "paid" | "rejected" | "failed";
  reference?: string;
  failureReason?: string;
  adminNote?: string;
  decidedAt?: string;
  createdAt: string;
};
type Earnings = {
  availableCents: number;
  waitingCents: number;
  inWithdrawalCents: number;
  paidOutCents: number;
  minPayoutCents: number;
  holdHours: number;
  bank: Bank | null;
  payouts: Payout[];
  orders: { _id: string; patientName: string; totalCents: number; commissionCents: number; commissionPercent: number; earningCents: number; deliveredAt: string; ready: boolean }[];
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const STATUS: Record<Payout["status"], { label: string; tone: string }> = {
  pending: { label: "Waiting for the clinic", tone: "bg-orange-50 text-orange-700" },
  processing: { label: "Being sent", tone: "bg-sky-50 text-sky-700" },
  paid: { label: "Paid", tone: "bg-teal-50 text-teal-700" },
  rejected: { label: "Not approved", tone: "bg-slate-100 text-slate-500" },
  failed: { label: "Transfer failed", tone: "bg-red-50 text-red-700" },
};
const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400";

/** The owner's money page: what the pharmacy has earned, and withdrawing it. */
export default function PharmacyEarnings() {
  const [data, setData] = useState<Earnings | null>(null);
  const [editingBank, setEditingBank] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.PHARMACY.EARNINGS);
      if (data.success) setData(data);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load earnings");
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
      const { data } = await axiosInstance.post(API_PATHS.PHARMACY.PAYOUTS, { cents });
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
              <RiMoneyDollarCircleLine size={20} />
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900">
              Earnings
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            Delivered orders minus the clinic&apos;s commission. Money becomes available {data.holdHours} hours after delivery.
          </p>
        </div>

        <section className="bg-slate-900 text-white rounded-[28px] p-6 sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[2px] text-teal-300">Available to withdraw</p>
          <p className="text-5xl font-black mt-2 tabular-nums">{money(data.availableCents)}</p>
          <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
            {[
              ["Waiting (last 24h)", data.waitingCents],
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
                      {p.requestedBy ? ` · by ${p.requestedBy}` : ""}
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
          <p className="font-black text-slate-900 mb-3">Delivered orders</p>
          {data.orders.length === 0 ? (
            <p className="text-sm text-slate-400">Your earnings appear here once orders are delivered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="text-left font-bold py-2">Delivered</th>
                    <th className="text-left font-bold py-2">Patient</th>
                    <th className="text-right font-bold py-2">Order</th>
                    <th className="text-right font-bold py-2 hidden sm:table-cell">Commission</th>
                    <th className="text-right font-bold py-2">You earn</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o._id} className="border-t border-slate-100">
                      <td className="py-2.5 text-slate-600">{when(o.deliveredAt)}</td>
                      <td className="py-2.5 text-slate-800">{o.patientName}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{money(o.totalCents)}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-500 hidden sm:table-cell">
                        {o.commissionCents ? `−${money(o.commissionCents)} (${o.commissionPercent}%)` : "None"}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-black text-slate-900">
                        {money(o.earningCents)}
                        {!o.ready && <span className="block text-[10px] font-bold text-slate-400">available soon</span>}
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

/** Where withdrawals are paid. Shared with the doctor's wallet, which passes its own endpoints. */
export function BankForm({
  onSaved,
  onCancel,
  banksPath = API_PATHS.PHARMACY.BANKS,
  savePath = API_PATHS.PHARMACY.PAYOUT_BANK,
}: {
  onSaved: () => void;
  onCancel?: () => void;
  banksPath?: string;
  savePath?: string;
}) {
  const [options, setOptions] = useState<{ paystack: boolean; banks: { name: string; code: string }[] } | null>(null);
  const [form, setForm] = useState({ bankCode: "", bankName: "", accountNumber: "", accountName: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get(banksPath, { silent: true } as any)
      .then(({ data }) => setOptions(data.success ? data : { paystack: false, banks: [] }))
      .catch(() => setOptions({ paystack: false, banks: [] }));
  }, [banksPath]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axiosInstance.put(
        savePath,
        options?.paystack ? { bankCode: form.bankCode, accountNumber: form.accountNumber } : { bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber },
      );
      if (data.success) {
        toast.success(data.message);
        onSaved();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!options) return <div className="h-24 mt-3 rounded-2xl bg-slate-100 animate-pulse" />;

  return (
    <form onSubmit={save} className="mt-3 space-y-3">
      {options.paystack ? (
        <>
          <select required value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} className={`${input} bg-white`}>
            <option value="">Choose the bank</option>
            {options.banks.map((b) => (
              <option key={`${b.code}-${b.name}`} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit account number"
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })}
            className={input}
          />
          <p className="text-[12px] text-slate-500">We check the account with the bank and save the name it gives us.</p>
        </>
      ) : (
        <>
          <input required placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={input} />
          <input required placeholder="Account name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className={input} />
          <input required placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className={input} />
        </>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-50">
          {saving ? "Checking…" : "Save account"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
