"use client";

import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../../components/panel";
import { usePharmacy } from "../../context/PharmacyContext";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import { ChangePasswordForm } from "./ChangePassword";

const label = "caption";
const input = "field mt-1";

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
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader eyebrow="Your pharmacy" title="Settings" subtitle={owner ? "Delivery, contact details and your password." : "Your password."} />

        {owner && pharmacy && (
          <form onSubmit={save} className="surface rounded-[22px] p-5 sm:p-6 space-y-4">
            <div>
              <p className="text-[16px] font-bold text-ink">Delivery and contact</p>
              <p className="text-[13px] text-ink-3">Patients only see you if they&apos;re within your delivery distance.</p>
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
              <p className="text-[13px] font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                We can&apos;t find this address on the map yet. Add the area and city so patients can be matched to you.
              </p>
            )}
            <button type="submit" disabled={saving} className="btn btn-teal !py-2.5 !px-5 !text-[14px] !rounded-xl disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        )}

        <section className="surface rounded-[22px] p-5 sm:p-6">
          <p className="text-[16px] font-bold text-ink mb-3">Your password</p>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
