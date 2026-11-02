"use client";

import { RiArrowLeftLine, RiCheckboxCircleLine } from "@remixicon/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

const label = "text-[10px] sm:text-xs font-black text-slate-400 uppercase ml-2 tracking-widest";

/** A pharmacy applies to sell in the shop, with its owner's login. The admin approves it. */
export default function PharmacyApply({ onDone }: { onDone: () => void }) {
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
    password: "",
    isPharmacist: false,
    pharmacistLicense: "",
  });
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.PHARMACY.APPLY, {
        name: form.name,
        licenseNumber: form.licenseNumber,
        email: form.email,
        phone: form.phone,
        address: { line1: form.line1, line2: form.line2 },
        deliveryRadiusKm: Number(form.deliveryRadiusKm),
        deliveryFeeCents: Math.round(Number(form.deliveryFee) * 100),
        owner: {
          name: form.ownerName,
          email: form.ownerEmail,
          password: form.password,
          pharmacistLicense: form.isPharmacist ? form.pharmacistLicense : undefined,
        },
      });
      if (data.success) setSent(true);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-6">
        <RiCheckboxCircleLine size={44} className="mx-auto text-teal-600" />
        <p className="text-2xl font-black text-slate-900 mt-3">Application sent</p>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          We&apos;ll check your licence and email you once it&apos;s decided. You can already log in with{" "}
          <strong>{form.ownerEmail}</strong> to add your staff.
        </p>
        <button onClick={onDone} className="mt-6 px-6 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
          Go to login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <button type="button" onClick={onDone} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700 mb-3">
          <RiArrowLeftLine size={14} /> Back to login
        </button>
        <p className="text-2xl sm:text-3xl font-black text-slate-900">Sell on ADJ&apos;s CODEs</p>
        <p className="text-sm text-slate-500 mt-1">For licensed pharmacies. The clinic checks your licence before you can sell.</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-black text-slate-900 mb-2">Your pharmacy</legend>
        <div className="space-y-1">
          <p className={label}>Pharmacy name</p>
          <input required value={form.name} onChange={set("name")} className="admin-input text-base" />
        </div>
        <div className="space-y-1">
          <p className={label}>Premises licence number</p>
          <input required value={form.licenseNumber} onChange={set("licenseNumber")} placeholder="e.g. PCN registration number" className="admin-input text-base" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className={label}>Pharmacy email</p>
            <input required type="email" value={form.email} onChange={set("email")} className="admin-input text-base" />
          </div>
          <div className="space-y-1">
            <p className={label}>Phone</p>
            <input required type="tel" value={form.phone} onChange={set("phone")} className="admin-input text-base" />
          </div>
        </div>
        <div className="space-y-1">
          <p className={label}>Street address</p>
          <input required value={form.line1} onChange={set("line1")} placeholder="12 Allen Avenue" className="admin-input text-base" />
        </div>
        <div className="space-y-1">
          <p className={label}>Area and city</p>
          <input value={form.line2} onChange={set("line2")} placeholder="Ikeja, Lagos" className="admin-input text-base" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className={label}>Deliver up to (km)</p>
            <input required type="number" min={1} max={100} value={form.deliveryRadiusKm} onChange={set("deliveryRadiusKm")} className="admin-input text-base" />
          </div>
          <div className="space-y-1">
            <p className={label}>Delivery fee ($)</p>
            <input required type="number" min={0} step="0.01" value={form.deliveryFee} onChange={set("deliveryFee")} className="admin-input text-base" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-black text-slate-900 mb-2">Your login (the owner)</legend>
        <div className="space-y-1">
          <p className={label}>Full name</p>
          <input required value={form.ownerName} onChange={set("ownerName")} className="admin-input text-base" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className={label}>Email</p>
            <input required type="email" value={form.ownerEmail} onChange={set("ownerEmail")} className="admin-input text-base" />
          </div>
          <div className="space-y-1">
            <p className={label}>Password</p>
            <input required type="password" minLength={8} value={form.password} onChange={set("password")} placeholder="At least 8 characters" className="admin-input text-base" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer ml-1">
          <input type="checkbox" checked={form.isPharmacist} onChange={set("isPharmacist")} className="accent-teal-600" />
          I&apos;m also a registered pharmacist
        </label>
        {form.isPharmacist && (
          <div className="space-y-1">
            <p className={label}>Your pharmacist licence number</p>
            <input required value={form.pharmacistLicense} onChange={set("pharmacistLicense")} className="admin-input text-base" />
          </div>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[2px] hover:bg-teal-600 transition-all disabled:opacity-50"
      >
        {saving ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
