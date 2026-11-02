"use client";

import { RiLockPasswordLine } from "@remixicon/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { usePharmacy } from "../../context/PharmacyContext";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400";

/** Change your own password (also used as the first-login screen). */
export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const { refresh } = usePharmacy();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", repeat: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.repeat) return toast.error("The new passwords don't match");
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.PHARMACY.CHANGE_PASSWORD, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      if (data.success) {
        toast.success(data.message);
        setForm({ currentPassword: "", newPassword: "", repeat: "" });
        await refresh();
        onDone?.();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input required type="password" placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} className={input} />
      <input required type="password" minLength={8} placeholder="New password (8+ characters)" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} className={input} />
      <input required type="password" minLength={8} placeholder="Repeat the new password" value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })} className={input} />
      <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-teal-600 disabled:opacity-50">
        {saving ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

/** Shown instead of the portal until someone replaces the starting password they were emailed. */
export default function ChangePasswordGate() {
  const { staff, pharmacy, logout } = usePharmacy();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FD] p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-portal p-6 sm:p-10">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <RiLockPasswordLine size={24} />
        </div>
        <p className="text-2xl font-black text-slate-900 mt-4">Choose your own password</p>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Welcome to {pharmacy?.name ?? "the pharmacy"}, {staff?.name.split(" ")[0]}. Replace the starting password we emailed you before you continue.
        </p>
        <ChangePasswordForm />
        <button onClick={logout} className="mt-4 text-[12px] font-bold text-slate-400 hover:text-slate-700">
          Log out
        </button>
      </div>
    </div>
  );
}
