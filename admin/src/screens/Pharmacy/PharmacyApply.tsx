"use client";

import { RiArrowLeftLine, RiCheckboxCircleLine } from "@remixicon/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

const label = "caption ml-1";

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
        <RiCheckboxCircleLine size={44} className="mx-auto text-brand-ink" />
        <p className="text-[24px] font-extrabold tracking-[-0.02em] text-ink mt-3">Application sent</p>
        <p className="text-[15px] text-ink-2 mt-2 max-w-sm mx-auto">
          We&apos;ll check your licence and email you once it&apos;s decided. You can already log in with{" "}
          <strong className="text-ink">{form.ownerEmail}</strong> to add your staff.
        </p>
        <button onClick={onDone} className="btn btn-ink mt-6 !rounded-xl">
          Go to login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <button type="button" onClick={onDone} className="flex items-center gap-1 text-[13px] font-bold text-ink-3 hover:text-ink mb-3">
          <RiArrowLeftLine size={14} /> Back to login
        </button>
        <p className="text-[26px] sm:text-[30px] leading-tight font-extrabold tracking-[-0.03em] text-ink">Sell through Clarity</p>
        <p className="text-[15px] text-ink-2 mt-1">For licensed pharmacies. The clinic checks your licence before you can sell.</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-[16px] font-bold text-ink mb-2">Your pharmacy</legend>
        <div className="space-y-1">
          <p className={label}>Pharmacy name</p>
          <input required value={form.name} onChange={set("name")} className="field" />
        </div>
        <div className="space-y-1">
          <p className={label}>Premises licence number</p>
          <input required value={form.licenseNumber} onChange={set("licenseNumber")} placeholder="e.g. PCN registration number" className="field" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className={label}>Pharmacy email</p>
            <input required type="email" value={form.email} onChange={set("email")} className="field" />
          </div>
          <div className="space-y-1">
            <p className={label}>Phone</p>
            <input required type="tel" value={form.phone} onChange={set("phone")} className="field" />
          </div>
        </div>
        <div className="space-y-1">
          <p className={label}>Street address</p>
          <input required value={form.line1} onChange={set("line1")} placeholder="12 Allen Avenue" className="field" />
        </div>
        <div className="space-y-1">
          <p className={label}>Area and city</p>
          <input value={form.line2} onChange={set("line2")} placeholder="Ikeja, Lagos" className="field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className={label}>Deliver up to (km)</p>
            <input required type="number" min={1} max={100} value={form.deliveryRadiusKm} onChange={set("deliveryRadiusKm")} className="field" />
          </div>
          <div className="space-y-1">
            <p className={label}>Delivery fee ($)</p>
            <input required type="number" min={0} step="0.01" value={form.deliveryFee} onChange={set("deliveryFee")} className="field" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[16px] font-bold text-ink mb-2">Your login (the owner)</legend>
        <div className="space-y-1">
          <p className={label}>Full name</p>
          <input required value={form.ownerName} onChange={set("ownerName")} className="field" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className={label}>Email</p>
            <input required type="email" value={form.ownerEmail} onChange={set("ownerEmail")} className="field" />
          </div>
          <div className="space-y-1">
            <p className={label}>Password</p>
            <input required type="password" minLength={8} value={form.password} onChange={set("password")} placeholder="At least 8 characters" className="field" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[14px] text-ink-2 cursor-pointer ml-1">
          <input type="checkbox" checked={form.isPharmacist} onChange={set("isPharmacist")} className="accent-teal-600" />
          I&apos;m also a registered pharmacist
        </label>
        {form.isPharmacist && (
          <div className="space-y-1">
            <p className={label}>Your pharmacist licence number</p>
            <input required value={form.pharmacistLicense} onChange={set("pharmacistLicense")} className="field" />
          </div>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="btn btn-ink w-full !rounded-xl !py-3.5 disabled:opacity-50"
      >
        {saving ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
