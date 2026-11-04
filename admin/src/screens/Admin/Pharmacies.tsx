"use client";

import { RiAddLine, RiCheckLine, RiCloseLine, RiForbidLine, RiMapPin2Line, RiStore2Line, RiTruckLine } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Pill, Skeleton } from "../../components/panel";
import type { Pharmacy } from "../../context/PharmacyContext";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Row = Pharmacy & { owners: { name: string; email: string; pharmacistLicense?: string }[]; staffCount: number };

const FILTERS = ["pending", "approved", "suspended", "rejected", "all"] as const;
const FILTER_LABEL: Record<(typeof FILTERS)[number], string> = {
  pending: "Waiting",
  approved: "Approved",
  suspended: "Suspended",
  rejected: "Rejected",
  all: "All",
};
const TONE: Record<Pharmacy["status"], "amber" | "brand" | "rose" | "neutral"> = {
  pending: "amber",
  approved: "brand",
  suspended: "rose",
  rejected: "neutral",
};
const STATUS_LABEL: Record<Pharmacy["status"], string> = {
  pending: "Waiting for review",
  approved: "Approved",
  suspended: "Suspended",
  rejected: "Rejected",
};
const input = "field";
const ghost = "flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line bg-white text-ink-2 text-[14px] font-bold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200";
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Pharmacies that want to (or do) sell in the shop: check the licence, approve, suspend. */
export default function Pharmacies() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.PHARMACIES, { params: filter === "all" ? {} : { status: filter } });
      if (data.success) setRows(data.pharmacies);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load pharmacies");
    }
  }, [filter]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <PageHeader
            eyebrow="Medicine shop"
            title="Pharmacies"
            subtitle="Check each licence with the Pharmacy Council before approving."
            action={
              !creating && (
                <button onClick={() => setCreating(true)} className="btn btn-ink !rounded-xl">
                  <RiAddLine size={17} /> Add the clinic&apos;s pharmacy
                </button>
              )
            }
          />
        </div>

        {creating && <CreateClinicPharmacy onDone={(created) => { setCreating(false); if (created) { setFilter("approved"); load(); } }} />}

        <div className="flex flex-wrap gap-1.5 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-[14px] font-bold ${
                filter === f ? "btn-ink" : "bg-white border border-line text-ink-2 hover:border-ink-3/40"
              }`}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>

        {rows === null ? (
          <Skeleton className="h-48" />
        ) : rows.length === 0 ? (
          <div className="surface rounded-[24px] p-12 text-center">
            <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand-ink mb-4 mx-auto">
              <RiStore2Line size={24} />
            </div>
            <p className="font-bold text-ink">Nothing here</p>
            <p className="text-[14px] text-ink-3 mt-1">{filter === "pending" ? "No applications are waiting." : "No pharmacies with this status."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((p) => (
              <PharmacyCard key={p._id} p={p} onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PharmacyCard({ p, onChanged }: { p: Row; onChanged: () => void }) {
  const [mode, setMode] = useState<"none" | "rejected" | "suspended">("none");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const setStatus = async (status: Pharmacy["status"], reason?: string) => {
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.ADMIN.PHARMACY_STATUS(p._id), { status, note: reason });
      if (data.success) {
        toast.success(data.message);
        onChanged();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface rounded-[22px] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[19px] font-extrabold tracking-[-0.02em] text-ink flex flex-wrap items-center gap-2">
            {p.name}
            {p.operatedByClinic && <Pill tone="violet">The clinic&apos;s own</Pill>}
            {p.demo && (
              <span title="Only shown to the test accounts in SHOP_DEMO_USERS">
                <Pill tone="amber">Demo</Pill>
              </span>
            )}
          </p>
          <p className="text-[13px] text-ink-3 mt-0.5">
            Applied {when(p.createdAt)} · <span className="num">{p.staffCount}</span> active staff
          </p>
        </div>
        <span className="self-start">
          <Pill tone={TONE[p.status]}>{STATUS_LABEL[p.status]}</Pill>
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 mt-4 text-[14px]">
        <div className="rounded-xl bg-canvas px-3 py-2.5">
          <p className="caption">Premises licence</p>
          <p className="num text-ink break-all mt-0.5">{p.licenseNumber}</p>
        </div>
        <div className="rounded-xl bg-canvas px-3 py-2.5">
          <p className="caption">Contact</p>
          <p className="font-bold text-ink break-all mt-0.5">{p.email}</p>
          <p className="text-[13px] text-ink-3">{p.phone}</p>
        </div>
        <div className="rounded-xl bg-canvas px-3 py-2.5">
          <p className="caption">Owner</p>
          {p.owners.map((o) => (
            <p key={o.email} className="text-[13px] text-ink-2 mt-0.5">
              <span className="font-bold text-ink">{o.name}</span>
              {o.pharmacistLicense ? ` · pharmacist ${o.pharmacistLicense}` : ""}
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[13px]">
        <span className={`flex items-center gap-1 ${p.located ? "text-ink-3" : "text-orange-700 font-bold"}`}>
          <RiMapPin2Line size={14} />
          {[p.address.line1, p.address.line2].filter(Boolean).join(", ")}
          {!p.located && " (not found on the map: can't be approved yet)"}
        </span>
        <span className="flex items-center gap-1 text-ink-3">
          <RiTruckLine size={14} /> Up to {p.deliveryRadiusKm} km · {p.deliveryFeeCents ? `$${(p.deliveryFeeCents / 100).toFixed(2)}` : "free"} delivery
        </span>
      </div>
      {p.statusNote && p.status !== "approved" && <p className="text-[14px] text-ink-2 mt-3 italic">Reason given: “{p.statusNote}”</p>}

      {mode === "none" ? (
        <div className="flex flex-wrap gap-2 mt-5">
          {p.status !== "approved" && (
            <button
              onClick={() => setStatus("approved")}
              disabled={saving || !p.located}
              title={p.located ? undefined : "Their address must be found on the map first"}
              className="btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl disabled:opacity-40"
            >
              <RiCheckLine size={16} /> {p.status === "suspended" ? "Lift suspension" : "Approve"}
            </button>
          )}
          {p.status === "pending" && (
            <button onClick={() => setMode("rejected")} className={ghost}>
              <RiCloseLine size={16} /> Reject
            </button>
          )}
          {p.status === "approved" && (
            <button onClick={() => setMode("suspended")} className={ghost}>
              <RiForbidLine size={16} /> Suspend
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-line bg-canvas/60 p-4 space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={mode === "rejected" ? "Why it wasn't approved (sent to the pharmacy)" : "Why it's suspended (sent to the pharmacy)"}
            className={`${input} resize-none`}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setStatus(mode, note)}
              disabled={saving || !note.trim()}
              className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-[14px] font-bold hover:bg-rose-700 disabled:opacity-40"
            >
              {saving ? "Saving…" : mode === "rejected" ? "Reject" : "Suspend"}
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

/** The clinic's own pharmacy: approved straight away, no commission. */
function CreateClinicPharmacy({ onDone }: { onDone: (created: boolean) => void }) {
  const [form, setForm] = useState({
    name: "",
    licenseNumber: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    deliveryRadiusKm: "10",
    deliveryFee: "0",
    ownerName: "",
    ownerEmail: "",
    pharmacistLicense: "",
  });
  const [saving, setSaving] = useState(false);
  const field = (k: keyof typeof form, placeholder: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={placeholder} className={input} {...extra} />
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.ADMIN.PHARMACIES, {
        name: form.name,
        licenseNumber: form.licenseNumber,
        email: form.email,
        phone: form.phone,
        address: { line1: form.line1, line2: form.line2 },
        deliveryRadiusKm: Number(form.deliveryRadiusKm),
        deliveryFeeCents: Math.round(Number(form.deliveryFee) * 100),
        owner: { name: form.ownerName, email: form.ownerEmail, pharmacistLicense: form.pharmacistLicense || undefined },
      });
      if (data.success) {
        toast.success(data.message);
        onDone(true);
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="surface rounded-[22px] p-5 sm:p-6 mb-6 space-y-3">
      <div>
        <p className="text-[16px] font-bold text-ink">The clinic&apos;s own pharmacy</p>
        <p className="text-[13px] text-ink-3">Approved straight away and sold through the same shop, with no commission. Its manager gets a login by email.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {field("name", "Pharmacy name", { required: true })}
        {field("licenseNumber", "Premises licence number", { required: true })}
        {field("email", "Pharmacy email", { required: true, type: "email" })}
        {field("phone", "Phone", { required: true, type: "tel" })}
        {field("line1", "Street address", { required: true })}
        {field("line2", "Area and city")}
        {field("deliveryRadiusKm", "Deliver up to (km)", { required: true, type: "number", min: 1, max: 100 })}
        {field("deliveryFee", "Delivery fee ($)", { required: true, type: "number", min: 0, step: "0.01" })}
      </div>
      <p className="text-[15px] font-bold text-ink pt-2">Who runs it</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {field("ownerName", "Full name", { required: true })}
        {field("ownerEmail", "Email", { required: true, type: "email" })}
        {field("pharmacistLicense", "Pharmacist licence (if they are one)")}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl disabled:opacity-50">
          {saving ? "Creating…" : "Create and email login"}
        </button>
        <button type="button" onClick={() => onDone(false)} className="px-4 py-2.5 rounded-xl text-[14px] font-bold text-ink-3 hover:bg-canvas">
          Cancel
        </button>
      </div>
    </form>
  );
}
