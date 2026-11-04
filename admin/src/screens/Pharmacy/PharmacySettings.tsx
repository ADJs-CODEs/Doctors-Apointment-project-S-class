"use client";

import { RiSettings3Line } from "@remixicon/react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { usePharmacy } from "../../context/PharmacyContext";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import { ChangePasswordForm } from "./ChangePassword";

const label = "text-[11px] font-bold uppercase tracking-wider text-slate-400";
const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 mt-1";

/** Delivery area, fee and contact details (owner), and your own password (everyone). */
export default function PharmacySettings() {
  const { staff, pharmacy, setPharmacy } = usePharmacy();
  const owner = staff?.role === "owner";
  const [form, setForm] = useState({ phone: "", line1: "", line2: "", deliveryRadiusKm: "10", deliveryFee: "0" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pharmacy) return;
    setForm({
      phone: pharmacy.phone,
      line1: pharmacy.address.line1,
      line2: pharmacy.address.line2 ?? "",
      deliveryRadiusKm: String(pharmacy.deliveryRadiusKm),
      deliveryFee: (pharmacy.deliveryFeeCents / 100).toFixed(2),
    });
  }, [pharmacy]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axiosInstance.put(API_PATHS.PHARMACY.SETTINGS, {
        phone: form.phone,
        address: { line1: form.line1, line2: form.line2 },
        deliveryRadiusKm: Number(form.deliveryRadiusKm),
        deliveryFeeCents: Math.round(Number(form.deliveryFee) * 100),
      });
      if (data.success) {
        setPharmacy(data.pharmacy);
        data.pharmacy.located ? toast.success(data.message) : toast.warning(data.message);
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
            <RiSettings3Line size={20} />
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900">
            Settings
          </h1>
        </div>

        {owner && pharmacy && (
          <form onSubmit={save} className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6 space-y-4">
            <div>
              <p className="font-black text-slate-900">Delivery and contact</p>
              <p className="text-[12px] text-slate-400">Patients only see you if they&apos;re within your delivery distance.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={label}>Deliver up to (km)</span>
                <input required type="number" min={1} max={100} step="0.5" value={form.deliveryRadiusKm} onChange={(e) => setForm({ ...form, deliveryRadiusKm: e.target.value })} className={input} />
              </label>
              <label className="block">
                <span className={label}>Delivery fee ($)</span>
                <input required type="number" min={0} step="0.01" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} className={input} />
              </label>
            </div>
            <label className="block">
              <span className={label}>Phone</span>
              <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
            </label>
            <label className="block">
              <span className={label}>Street address</span>
              <input required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className={input} />
            </label>
            <label className="block">
              <span className={label}>Area and city</span>
              <input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className={input} />
            </label>
            {!pharmacy.located && (
              <p className="text-[12px] font-bold text-orange-700 bg-orange-50 rounded-xl px-3 py-2">
                We can&apos;t find this address on the map yet. Add the area and city so patients can be matched to you.
              </p>
            )}
            <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        )}

        <section className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6">
          <p className="font-black text-slate-900 mb-3">Your password</p>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
