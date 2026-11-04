"use client";

import { RiAddLine, RiCheckLine, RiCloseLine, RiForbidLine, RiMapPin2Line, RiStore2Line, RiTruckLine } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Pharmacy } from "../../context/PharmacyContext";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Row = Pharmacy & { owners: { name: string; email: string; pharmacistLicense?: string }[]; staffCount: number };

const FILTERS = ["pending", "approved", "suspended", "rejected", "all"] as const;
const TONE: Record<Pharmacy["status"], string> = {
  pending: "bg-orange-50 text-orange-700 border-orange-100",
  approved: "bg-teal-50 text-teal-700 border-teal-100",
  suspended: "bg-red-50 text-red-700 border-red-100",
  rejected: "bg-slate-100 text-slate-500 border-slate-200",
};
const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400";
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
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
                <RiStore2Line size={20} />
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900">
                Pharmacies
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">Check each licence with the Pharmacy Council before approving.</p>
          </div>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-teal-600"
            >
              <RiAddLine size={16} /> Add the clinic&apos;s pharmacy
            </button>
          )}
        </div>

        {creating && <CreateClinicPharmacy onDone={(created) => { setCreating(false); if (created) { setFilter("approved"); load(); } }} />}

        <div className="flex flex-wrap gap-1.5 mb-6">
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

        {rows === null ? (
          <div className="h-48 rounded-[28px] bg-slate-200/60 animate-pulse" />
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center">
            <p className="font-black text-slate-900">Nothing here</p>
            <p className="text-sm text-slate-400 mt-1">{filter === "pending" ? "No applications are waiting." : "No pharmacies with this status."}</p>
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
    <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xl font-black text-slate-900 flex flex-wrap items-center gap-2">
            {p.name}
            {p.operatedByClinic && <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1 rounded-full">Clinic</span>}
            {p.demo && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full" title="Only shown to the test accounts in SHOP_DEMO_USERS">
                Demo
              </span>
            )}
          </p>
          <p className="text-[12px] text-slate-400">
            Applied {when(p.createdAt)} · {p.staffCount} active staff
          </p>
        </div>
        <span className={`self-start text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${TONE[p.status]}`}>{p.status}</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 mt-4 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Premises licence</p>
          <p className="font-bold text-slate-800 break-all">{p.licenseNumber}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact</p>
          <p className="font-bold text-slate-800 break-all">{p.email}</p>
          <p className="text-[12px] text-slate-500">{p.phone}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner</p>
          {p.owners.map((o) => (
            <p key={o.email} className="text-[12px] text-slate-700">
              <span className="font-bold">{o.name}</span>
              {o.pharmacistLicense ? ` · pharmacist ${o.pharmacistLicense}` : ""}
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[12px]">
        <span className={`flex items-center gap-1 ${p.located ? "text-slate-500" : "text-orange-700 font-bold"}`}>
          <RiMapPin2Line size={14} />
          {[p.address.line1, p.address.line2].filter(Boolean).join(", ")}
          {!p.located && " (not found on the map: can't be approved yet)"}
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <RiTruckLine size={14} /> Up to {p.deliveryRadiusKm} km · {p.deliveryFeeCents ? `$${(p.deliveryFeeCents / 100).toFixed(2)}` : "free"} delivery
        </span>
      </div>
      {p.statusNote && p.status !== "approved" && <p className="text-sm text-slate-500 mt-3 italic">Reason given: “{p.statusNote}”</p>}

      {mode === "none" ? (
        <div className="flex flex-wrap gap-2 mt-5">
          {p.status !== "approved" && (
            <button
              onClick={() => setStatus("approved")}
              disabled={saving || !p.located}
              title={p.located ? undefined : "Their address must be found on the map first"}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-40"
            >
              <RiCheckLine size={16} /> {p.status === "suspended" ? "Lift suspension" : "Approve"}
            </button>
          )}
          {p.status === "pending" && (
            <button
              onClick={() => setMode("rejected")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <RiCloseLine size={16} /> Reject
            </button>
          )}
          {p.status === "approved" && (
            <button
              onClick={() => setMode("suspended")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <RiForbidLine size={16} /> Suspend
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 p-4 space-y-3">
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
              className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40"
            >
              {saving ? "Saving…" : mode === "rejected" ? "Reject" : "Suspend"}
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
    <form onSubmit={submit} className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6 mb-6 space-y-3">
      <div>
        <p className="font-black text-slate-900">The clinic&apos;s own pharmacy</p>
        <p className="text-[12px] text-slate-500">Approved straight away and sold through the same shop, with no commission. Its manager gets a login by email.</p>
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
      <p className="text-sm font-black text-slate-900 pt-2">Who runs it</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {field("ownerName", "Full name", { required: true })}
        {field("ownerEmail", "Email", { required: true, type: "email" })}
        {field("pharmacistLicense", "Pharmacist licence (if they are one)")}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-50">
          {saving ? "Creating…" : "Create and email login"}
        </button>
        <button type="button" onClick={() => onDone(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">
          Cancel
        </button>
      </div>
    </form>
  );
}
