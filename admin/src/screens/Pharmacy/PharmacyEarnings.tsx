"use client";

import { RiBankLine, RiCheckboxCircleLine, RiTimeLine, RiWallet3Line } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Pill, Skeleton } from "../../components/panel";
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
const STATUS: Record<Payout["status"], { label: string; tone: "amber" | "violet" | "brand" | "neutral" | "rose" }> = {
  pending: { label: "Waiting for the clinic", tone: "amber" },
  processing: { label: "Being sent", tone: "violet" },
  paid: { label: "Paid", tone: "brand" },
  rejected: { label: "Not approved", tone: "neutral" },
  failed: { label: "Transfer failed", tone: "rose" },
};
const input = "field";

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
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const open = data.payouts.find((p) => p.status === "pending" || p.status === "processing");
  const canWithdraw = !open && !!data.bank && data.availableCents >= data.minPayoutCents;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          eyebrow="Your pharmacy"
          title="Earnings"
          subtitle={<>Delivered orders minus the clinic&apos;s commission. Money becomes available {data.holdHours} hours after delivery.</>}
        />

        <section className="btn-ink rounded-[24px] p-6 sm:p-8">
          <p className="text-[14px] font-bold text-[#8FE3E1] flex items-center gap-2">
            <RiWallet3Line size={17} /> Available to withdraw
          </p>
          <p className="num text-[48px] leading-none mt-3">{money(data.availableCents)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-[14px]">
            {[
              [`Waiting (last ${data.holdHours}h)`, data.waitingCents],
              ["Being withdrawn", data.inWithdrawalCents],
              ["Paid out so far", data.paidOutCents],
            ].map(([label, cents]) => (
              <div key={label as string} className="rounded-2xl bg-white/[.06] border border-white/10 px-3 py-2.5">
                <p className="text-[13px] text-white/60">{label}</p>
                <p className="num mt-0.5">{money(cents as number)}</p>
              </div>
            ))}
          </div>

          {open ? (
            <p className="mt-5 flex items-center gap-2 text-[14px] font-bold text-white/85 bg-white/[.06] border border-white/10 rounded-2xl px-4 py-3">
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
                className="num flex-1 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/45 outline-none focus:border-[#8FE3E1] disabled:opacity-40"
              />
              <button type="submit" disabled={!canWithdraw || busy} className="btn btn-teal !rounded-xl !px-6 disabled:opacity-40">
                {busy ? "Requesting…" : "Withdraw"}
              </button>
            </form>
          )}
          {!open && !canWithdraw && (
            <p className="text-[13px] text-white/55 mt-2">
              {!data.bank ? "Add your bank account below first." : `You can withdraw from ${money(data.minPayoutCents)}.`}
            </p>
          )}
        </section>

        <section className="surface rounded-[22px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[16px] font-bold text-ink flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-[10px] grid place-items-center border border-teal-100 bg-brand-soft text-brand-ink">
                <RiBankLine size={17} />
              </span>
              Bank account
            </p>
            {data.bank && !editingBank && (
              <button onClick={() => setEditingBank(true)} className="text-[13px] font-bold text-brand-ink hover:underline">
                Change
              </button>
            )}
          </div>
          {data.bank && !editingBank ? (
            <div className="mt-3 text-[14px]">
              <p className="font-bold text-ink">{data.bank.accountName}</p>
              <p className="text-ink-2">
                {data.bank.bankName} · <span className="num">{data.bank.accountNumber}</span>
              </p>
              <p className={`mt-1 text-[13px] flex items-center gap-1 ${data.bank.verified ? "text-brand-ink" : "text-ink-3"}`}>
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

        <section className="surface rounded-[22px] p-5 sm:p-6">
          <p className="text-[16px] font-bold text-ink mb-3">Withdrawals</p>
          {data.payouts.length === 0 ? (
            <p className="text-[14px] text-ink-3">None yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.payouts.map((p) => (
                <li key={p._id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="num text-[16px] text-ink">{money(p.cents)}</p>
                    <p className="text-[13px] text-ink-3">
                      {when(p.createdAt)}
                      {p.requestedBy ? ` · by ${p.requestedBy}` : ""}
                      {p.status === "paid" && p.reference ? ` · ref ${p.reference}` : ""}
                      {p.failureReason ? ` · ${p.failureReason}` : ""}
                      {p.status === "rejected" && p.adminNote ? ` · ${p.adminNote}` : ""}
                    </p>
                  </div>
                  <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface rounded-[22px] p-5 sm:p-6">
          <p className="text-[16px] font-bold text-ink mb-3">Delivered orders</p>
          {data.orders.length === 0 ? (
            <p className="text-[14px] text-ink-3">Your earnings appear here once orders are delivered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead className="text-[13px] text-ink-3">
                  <tr>
                    <th className="text-left font-semibold py-2">Delivered</th>
                    <th className="text-left font-semibold py-2">Patient</th>
                    <th className="text-right font-semibold py-2">Order</th>
                    <th className="text-right font-semibold py-2 hidden sm:table-cell">Commission</th>
                    <th className="text-right font-semibold py-2">You earn</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o._id} className="border-t border-line">
                      <td className="py-2.5 text-ink-2">{when(o.deliveredAt)}</td>
                      <td className="py-2.5 text-ink">{o.patientName}</td>
                      <td className="py-2.5 text-right num text-ink-2">{money(o.totalCents)}</td>
                      <td className="py-2.5 text-right num text-ink-3 hidden sm:table-cell">
                        {o.commissionCents ? `−${money(o.commissionCents)} (${o.commissionPercent}%)` : "None"}
                      </td>
                      <td className="py-2.5 text-right num text-ink">
                        {money(o.earningCents)}
                        {!o.ready && <span className="block text-[11px] font-sans font-semibold text-ink-3">available soon</span>}
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

  if (!options) return <Skeleton className="h-24 mt-3 !rounded-2xl" />;

  return (
    <form onSubmit={save} className="mt-3 space-y-3">
      {options.paystack ? (
        <>
          <select required value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} className={input}>
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
            className={`${input} num`}
          />
          <p className="text-[13px] text-ink-3">We check the account with the bank and save the name it gives us.</p>
        </>
      ) : (
        <>
          <input required placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={input} />
          <input required placeholder="Account name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className={input} />
          <input required placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className={`${input} num`} />
        </>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl disabled:opacity-50">
          {saving ? "Checking…" : "Save account"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl text-[14px] font-bold text-ink-3 hover:bg-canvas">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
