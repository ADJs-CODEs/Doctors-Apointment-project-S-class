"use client";

import { RiAddLine, RiKey2Line, RiTeamLine, RiUserForbidLine, RiUserFollowLine } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { type PharmacyStaff as Person, type StaffRole, usePharmacy } from "../../context/PharmacyContext";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

const ROLE_INFO: Record<StaffRole, string> = {
  owner: "Everything: staff, delivery settings, earnings",
  pharmacist: "Approves prescription-only orders (licence recorded)",
  staff: "Products, stock, packing and deliveries",
};

const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400";

/** The owner's view of everyone who works for the pharmacy. */
export default function PharmacyStaff() {
  const { staff: me } = usePharmacy();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "staff" as StaffRole, pharmacistLicense: "" });
  const [busy, setBusy] = useState<string | null>(null);
  // making someone a pharmacist needs their licence number first
  const [licenceFor, setLicenceFor] = useState<{ id: string; value: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.PHARMACY.STAFF);
      if (data.success) setPeople(data.staff);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load staff");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, request: Promise<{ data: any }>) => {
    setBusy(key);
    try {
      const { data } = await request;
      if (data.success) {
        toast.success(data.message);
        await load();
        return true;
      }
      toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(null);
    }
    return false;
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run("add", axiosInstance.post(API_PATHS.PHARMACY.STAFF, form));
    if (ok) {
      setAdding(false);
      setForm({ name: "", email: "", role: "staff", pharmacistLicense: "" });
    }
  };

  const changeRole = (p: Person, role: StaffRole) => {
    if (role === "pharmacist" && !p.pharmacistLicense) return setLicenceFor({ id: p._id, value: "" });
    run(p._id, axiosInstance.patch(API_PATHS.PHARMACY.STAFF_ONE(p._id), { role }));
  };

  const saveLicence = async (e: FormEvent) => {
    e.preventDefault();
    if (!licenceFor) return;
    const ok = await run(
      licenceFor.id,
      axiosInstance.patch(API_PATHS.PHARMACY.STAFF_ONE(licenceFor.id), { role: "pharmacist", pharmacistLicense: licenceFor.value }),
    );
    if (ok) setLicenceFor(null);
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
                <RiTeamLine size={20} />
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900">
                Pharmacy <span className="text-teal-500 font-serif italic">staff</span>
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">Everyone who can log in for your pharmacy, and what they&apos;re allowed to do.</p>
          </div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"
            >
              <RiAddLine size={16} /> Add someone
            </button>
          )}
        </div>

        {adding && (
          <form onSubmit={add} className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6 mb-6 space-y-3">
            <p className="font-black text-slate-900">Add someone</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              {(Object.keys(ROLE_INFO) as StaffRole[]).map((r) => (
                <label
                  key={r}
                  className={`rounded-2xl border p-3 cursor-pointer ${form.role === r ? "border-teal-500 bg-teal-50/60" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <input type="radio" name="role" className="sr-only" checked={form.role === r} onChange={() => setForm({ ...form, role: r })} />
                  <p className="text-sm font-black text-slate-900 capitalize">{r}</p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{ROLE_INFO[r]}</p>
                </label>
              ))}
            </div>
            {form.role === "pharmacist" && (
              <input required placeholder="Pharmacist licence number" value={form.pharmacistLicense} onChange={(e) => setForm({ ...form, pharmacistLicense: e.target.value })} className={input} />
            )}
            <p className="text-[12px] text-slate-500">We&apos;ll email them a starting password; they change it the first time they log in.</p>
            <div className="flex gap-2">
              <button type="submit" disabled={busy === "add"} className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-50">
                {busy === "add" ? "Adding…" : "Add and email login"}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
            </div>
          </form>
        )}

        {people === null ? (
          <div className="h-48 rounded-[28px] bg-slate-200/60 animate-pulse" />
        ) : (
          <ul className="space-y-3">
            {people.map((p) => {
              const isMe = p._id === me?._id;
              return (
                <li
                  key={p._id}
                  className={`bg-white rounded-[24px] border p-4 sm:p-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 ${p.active ? "border-slate-200" : "border-slate-100 opacity-60"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900">
                      {p.name} {isMe && <span className="text-[11px] font-bold text-slate-400">(you)</span>}
                      {!p.active && <span className="ml-2 text-[10px] font-black uppercase text-slate-400">Deactivated</span>}
                    </p>
                    <p className="text-[12px] text-slate-500 [overflow-wrap:anywhere]">
                      {p.email}
                      {p.pharmacistLicense ? ` · Licence ${p.pharmacistLicense}` : ""}
                      {p.mustChangePassword ? " · hasn't logged in yet" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={p.role}
                      disabled={isMe || busy === p._id}
                      onChange={(e) => changeRole(p, e.target.value as StaffRole)}
                      aria-label={`${p.name}'s role`}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold capitalize bg-white disabled:opacity-60"
                    >
                      {(Object.keys(ROLE_INFO) as StaffRole[]).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {!isMe && (
                      <>
                        <button
                          onClick={() => run(p._id, axiosInstance.post(API_PATHS.PHARMACY.STAFF_RESET(p._id)))}
                          disabled={busy === p._id || !p.active}
                          title="Email a new starting password"
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <RiKey2Line size={17} />
                        </button>
                        <button
                          onClick={() => run(p._id, axiosInstance.patch(API_PATHS.PHARMACY.STAFF_ONE(p._id), { active: !p.active }))}
                          disabled={busy === p._id}
                          title={p.active ? "Deactivate (they can't log in)" : "Reactivate"}
                          className={`p-2 rounded-xl border ${p.active ? "border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600" : "border-teal-200 text-teal-600 hover:bg-teal-50"}`}
                        >
                          {p.active ? <RiUserForbidLine size={17} /> : <RiUserFollowLine size={17} />}
                        </button>
                      </>
                    )}
                  </div>
                  {licenceFor?.id === p._id && (
                    <form onSubmit={saveLicence} className="sm:basis-full flex flex-wrap items-center gap-2 rounded-2xl bg-teal-50/60 border border-teal-100 p-3">
                      <p className="text-[12px] font-bold text-teal-900 w-full">
                        To make {p.name.split(" ")[0]} a pharmacist, enter their licence number:
                      </p>
                      <input
                        autoFocus
                        required
                        value={licenceFor.value}
                        onChange={(e) => setLicenceFor({ ...licenceFor, value: e.target.value })}
                        placeholder="Pharmacist licence number"
                        className="flex-1 min-w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 bg-white"
                      />
                      <button type="submit" disabled={busy === p._id} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-50">
                        Save
                      </button>
                      <button type="button" onClick={() => setLicenceFor(null)} className="px-3 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-white">
                        Cancel
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
