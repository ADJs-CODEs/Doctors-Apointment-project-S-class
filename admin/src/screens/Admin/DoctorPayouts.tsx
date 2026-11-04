"use client";

import { RiStethoscopeLine } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import { Skeleton } from "../../components/panel";
import { type PayoutFilter, PayoutFilters } from "./payout-ui";
import { type Payout, PayoutCard } from "./PharmacyPayouts";

/** Doctors withdrawing what their visits earned, and the clinic's share of each visit. */
export default function DoctorPayouts() {
  const [filter, setFilter] = useState<PayoutFilter>("pending");
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
        <p className="text-ink-2 text-[15px]">Doctors withdraw what paid visits earned them (after your share), 7 days after each visit.</p>
        <PayoutFilters value={filter} onChange={setFilter} />
      </div>

      {rows === null ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <div className="surface rounded-[24px] p-12 text-center">
          <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand-ink mb-4 mx-auto">
            <RiStethoscopeLine size={24} />
          </div>
          <p className="font-bold text-ink">Nothing here</p>
          <p className="text-[14px] text-ink-3 mt-1">{filter === "pending" ? "No doctor withdrawals are waiting." : "No withdrawals with this status."}</p>
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
              icon={<RiStethoscopeLine size={15} className="text-brand-ink" />}
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
    <form onSubmit={save} className="surface rounded-[22px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <p className="text-[16px] font-bold text-ink">The clinic&apos;s share of each visit</p>
        <p className="text-[13px] text-ink-3 mt-0.5">
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
            className="field num !w-24 !pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-3">%</span>
        </div>
        <button
          type="submit"
          disabled={saving || percent === null || value === String(percent) || value === ""}
          className="btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
