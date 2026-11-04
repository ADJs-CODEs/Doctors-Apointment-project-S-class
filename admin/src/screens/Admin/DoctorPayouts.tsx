"use client";

import { RiStethoscopeLine } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import { type Payout, PayoutCard } from "./PharmacyPayouts";

const FILTERS = ["pending", "processing", "paid", "failed", "rejected", "all"] as const;

/** Doctors withdrawing what their visits earned, and the clinic's share of each visit. */
export default function DoctorPayouts() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [rows, setRows] = useState<(Payout & { doctorName: string })[] | null>(null);
  const [paystack, setPaystack] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.DOCTOR_PAYOUTS, { params: filter === "all" ? {} : { status: filter } });
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
    <div className="max-w-5xl mx-auto space-y-6">
      <Commission />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <p className="text-slate-500 text-sm">Doctors withdraw what paid visits earned them (after your share), 7 days after each visit.</p>
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
          <p className="text-sm text-slate-400 mt-1">{filter === "pending" ? "No doctor withdrawals are waiting." : "No withdrawals with this status."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((p) => (
            <PayoutCard
              key={p._id}
              p={p}
              paystack={paystack}
              onChanged={load}
              path={API_PATHS.ADMIN.DOCTOR_PAYOUT}
              icon={<RiStethoscopeLine size={15} className="text-teal-600" />}
              who="doctor"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Commission() {
  const [percent, setPercent] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get(API_PATHS.ADMIN.DOCTOR_COMMISSION)
      .then(({ data }) => {
        if (data.success) {
          setPercent(data.percent);
          setValue(String(data.percent));
        }
      })
      .catch(() => undefined);
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axiosInstance.put(API_PATHS.ADMIN.DOCTOR_COMMISSION, { percent: Number(value) });
      if (data.success) {
        toast.success(data.message);
        setPercent(data.percent);
        setValue(String(data.percent));
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <p className="font-black text-slate-900">The clinic&apos;s share of each visit</p>
        <p className="text-[12px] text-slate-500 mt-0.5">
          Taken from every paid visit a doctor completes (and from the kept half of a patient no-show). Changing it only affects visits from now on.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="number"
            min={0}
            max={50}
            step="0.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={percent === null}
            className="w-24 rounded-xl border border-slate-200 pl-3 pr-7 py-2.5 text-sm font-bold tabular-nums outline-none focus:border-teal-400"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
        </div>
        <button
          type="submit"
          disabled={saving || percent === null || value === String(percent) || value === ""}
          className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
