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
import { useNavigate, useSearchParams } from "@/lib/navigation";
import { PageHeader, Pill, Skeleton } from "../../components/panel";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import DoctorPayouts from "./DoctorPayouts";
import { PAYOUT_FILTERS as FILTERS, PAYOUT_STATUS, PayoutFilters } from "./payout-ui";
import PharmacyPayouts from "./PharmacyPayouts";

/** Money going out: patients' care funds, doctors' and pharmacies' earnings. */
export default function Payouts() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tab = params.get("tab") === "pharmacies" ? "pharmacies" : params.get("tab") === "doctors" ? "doctors" : "care";
  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto mb-6 space-y-5">
        <PageHeader eyebrow="Money" title="Payouts" subtitle="Withdrawals from patients' care funds, doctors and pharmacies." />
        <div className="flex gap-1 p-1 bg-white border border-line rounded-2xl w-fit max-w-full overflow-x-auto">
          {(
            [
              ["care", "Patients' care funds"],
              ["doctors", "Doctors"],
              ["pharmacies", "Pharmacies"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => navigate(key === "care" ? "/payouts" : `/payouts?tab=${key}`)}
              className={`shrink-0 px-4 py-2 rounded-xl text-[15px] font-bold ${tab === key ? "btn-ink" : "text-ink-2 hover:bg-canvas"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "care" ? <CareFundPayouts /> : tab === "doctors" ? <DoctorPayouts /> : <PharmacyPayouts />}
    </div>
  );
}

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

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/** Care fund withdrawals: verify the person, send the transfer, then record it here. */
function CareFundPayouts() {
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
    <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <p className="text-ink-2 text-[15px]">
            {setup.paystack
              ? "Verify the patient, then send it through Paystack. Failed transfers return the money to their fund."
              : "Verify the patient, send the bank transfer, then mark it paid with the reference."}
          </p>
          <PayoutFilters value={filter} onChange={setFilter} />
        </div>

        {payouts === null ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <div className="surface rounded-[24px] p-12 text-center">
            <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand-ink mb-4 mx-auto">
              <RiBankLine size={24} />
            </div>
            <p className="font-bold text-ink">Nothing here</p>
            <p className="text-[14px] text-ink-3 mt-1">
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

  const status = PAYOUT_STATUS[p.status];

  return (
    <div className="surface rounded-[22px] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="num text-[30px] leading-none text-ink">
            {money(p.cents)}
            {kobo != null && <span className="text-[18px] text-ink-3"> · {naira(kobo)}</span>}
          </p>
          <p className="text-[15px] font-bold text-ink mt-2">
            {p.userName} <span className="font-medium text-ink-3">· {p.userEmail}</span>
          </p>
          <p className="text-[13px] text-ink-3">Requested {when(p.createdAt)}</p>
        </div>
        <span className="self-start">
          <Pill tone={status.tone}>{status.label}</Pill>
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 mt-4 text-[14px]">
        {[
          ["Account name", p.accountName],
          ["Bank", p.bankName],
          ["Account number", p.accountNumber],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-canvas px-3 py-2.5">
            <p className="caption">{label}</p>
            <p className={`text-ink break-all mt-0.5 ${label === "Account number" ? "num" : "font-bold"}`}>{value}</p>
          </div>
        ))}
      </div>
      {p.resolvedAccountName && (
        <p
          className={`flex items-center gap-1.5 text-[13px] font-bold mt-3 ${
            p.nameMatches ? "text-brand-ink" : "text-orange-700"
          }`}
        >
          {p.nameMatches ? <RiCheckLine size={15} /> : <RiErrorWarningLine size={15} />}
          {p.nameMatches
            ? "The bank confirmed this account, and the name matches the patient"
            : `The bank says this account belongs to ${p.resolvedAccountName}, which doesn't match ${p.userName}. Check before sending.`}
        </p>
      )}
      {p.note && <p className="text-[14px] text-ink-2 mt-3 italic">“{p.note}”</p>}

      {p.status === "processing" ? (
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <p className="text-[14px] text-video">Sent to Paystack, waiting for the bank to confirm.</p>
          <button
            onClick={refresh}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white text-ink-2 text-[13px] font-bold hover:bg-canvas disabled:opacity-40"
          >
            <RiRefreshLine size={14} /> {saving ? "Checking…" : "Check again"}
          </button>
        </div>
      ) : p.status !== "pending" ? (
        <p className="text-[14px] text-ink-3 mt-4">
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
              className="btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl"
            >
              <RiSendPlaneLine size={16} /> Send via Paystack
            </button>
          )}
          <button
            onClick={() => setMode("pay")}
            className={
              canSend
                ? "flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line bg-white text-ink-2 text-[14px] font-bold hover:bg-canvas"
                : "btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl"
            }
          >
            <RiCheckLine size={16} /> I&apos;ve sent it by hand
          </button>
          <button
            onClick={() => setMode("reject")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line bg-white text-ink-2 text-[14px] font-bold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
          >
            <RiCloseLine size={16} /> Reject
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-line bg-canvas/60 p-4 space-y-3">
          {(mode === "pay" || mode === "send") && (
            <>
              {mode === "pay" ? (
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Bank transfer reference"
                  className="field"
                />
              ) : (
                <p className="text-[14px] text-ink-2">
                  Paystack will send {kobo != null ? naira(kobo) : money(p.cents)} to {p.resolvedAccountName ?? p.accountName} at{" "}
                  {p.bankName}. This can&apos;t be undone.
                </p>
              )}
              <label className="flex items-start gap-2 text-[14px] text-ink-2 cursor-pointer">
                <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-0.5 accent-teal-600" />
                <span className="flex items-center gap-1.5">
                  <RiShieldUserLine size={16} className="text-brand-ink" />
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
            className="field resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={
                saving ||
                (mode === "pay" ? !reference.trim() || !verified : mode === "send" ? !verified : !note.trim())
              }
              className={`disabled:opacity-40 ${
                mode === "reject"
                  ? "px-4 py-2.5 rounded-xl text-white text-[14px] font-bold bg-rose-600 hover:bg-rose-700"
                  : "btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl"
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
            <button onClick={() => setMode("none")} className="px-4 py-2.5 rounded-xl text-[14px] font-bold text-ink-3 hover:bg-white">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
