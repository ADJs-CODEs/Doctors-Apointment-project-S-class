"use client";

import { RiAddLine, RiKey2Line, RiUserForbidLine, RiUserFollowLine } from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Pill, Skeleton } from "../../components/panel";
import { type PharmacyStaff as Person, type StaffRole, usePharmacy } from "../../context/PharmacyContext";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

const ROLE_INFO: Record<StaffRole, string> = {
  owner: "Everything: staff, delivery settings, earnings",
  pharmacist: "Approves prescription-only orders (licence recorded)",
  staff: "Products, stock, packing and deliveries",
};

const input = "field";
const iconBtn = "p-2 rounded-xl border border-line bg-white text-ink-3 hover:bg-canvas disabled:opacity-40";

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
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <PageHeader
            eyebrow="Your pharmacy"
            title="Staff"
            subtitle="Everyone who can log in for your pharmacy, and what they're allowed to do."
            action={
              !adding && (
                <button onClick={() => setAdding(true)} className="btn btn-teal !rounded-xl">
                  <RiAddLine size={16} /> Add someone
                </button>
              )
            }
          />
        </div>

        {adding && (
          <form onSubmit={add} className="surface rounded-[22px] p-5 sm:p-6 mb-6 space-y-3">
            <p className="text-[16px] font-bold text-ink">Add someone</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              {(Object.keys(ROLE_INFO) as StaffRole[]).map((r) => (
                <label
                  key={r}
                  className={`rounded-2xl border-[1.5px] p-3 cursor-pointer ${form.role === r ? "border-brand bg-brand-soft/60" : "border-line hover:bg-canvas"}`}
                >
                  <input type="radio" name="role" className="sr-only" checked={form.role === r} onChange={() => setForm({ ...form, role: r })} />
                  <p className="text-[15px] font-bold text-ink capitalize">{r}</p>
                  <p className="text-[12px] text-ink-3 leading-snug mt-0.5">{ROLE_INFO[r]}</p>
                </label>
              ))}
            </div>
            {form.role === "pharmacist" && (
              <input required placeholder="Pharmacist licence number" value={form.pharmacistLicense} onChange={(e) => setForm({ ...form, pharmacistLicense: e.target.value })} className={input} />
            )}
            <p className="text-[13px] text-ink-3">We&apos;ll email them a starting password; they change it the first time they log in.</p>
            <div className="flex gap-2">
              <button type="submit" disabled={busy === "add"} className="btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl disabled:opacity-50">
                {busy === "add" ? "Adding…" : "Add and email login"}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="px-4 py-2.5 rounded-xl text-[14px] font-bold text-ink-3 hover:bg-canvas">
                Cancel
              </button>
            </div>
          </form>
        )}

        {people === null ? (
          <Skeleton className="h-48" />
        ) : (
          <ul className="space-y-3">
            {people.map((p) => {
              const isMe = p._id === me?._id;
              return (
                <li
                  key={p._id}
                  className={`surface rounded-[20px] p-4 sm:p-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 ${p.active ? "" : "opacity-60"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-bold text-ink flex flex-wrap items-center gap-2">
                      {p.name} {isMe && <span className="text-[13px] font-semibold text-ink-3">(you)</span>}
                      {!p.active && <Pill>Deactivated</Pill>}
                    </p>
                    <p className="text-[13px] text-ink-3 [overflow-wrap:anywhere]">
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
                      className="rounded-xl border-[1.5px] border-line px-3 py-2 text-[14px] font-bold text-ink capitalize bg-white disabled:opacity-60"
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
                          aria-label={`Email ${p.name} a new starting password`}
                          className={iconBtn}
                        >
                          <RiKey2Line size={17} />
                        </button>
                        <button
                          onClick={() => run(p._id, axiosInstance.patch(API_PATHS.PHARMACY.STAFF_ONE(p._id), { active: !p.active }))}
                          disabled={busy === p._id}
                          title={p.active ? "Deactivate (they can't log in)" : "Reactivate"}
                          aria-label={p.active ? `Deactivate ${p.name}` : `Reactivate ${p.name}`}
                          className={`p-2 rounded-xl border bg-white ${p.active ? "border-line text-ink-3 hover:bg-rose-50 hover:text-rose-600" : "border-teal-200 text-brand-ink hover:bg-brand-soft"}`}
                        >
                          {p.active ? <RiUserForbidLine size={17} /> : <RiUserFollowLine size={17} />}
                        </button>
                      </>
                    )}
                  </div>
                  {licenceFor?.id === p._id && (
                    <form onSubmit={saveLicence} className="sm:basis-full flex flex-wrap items-center gap-2 rounded-2xl bg-brand-soft/60 border border-teal-100 p-3">
                      <p className="text-[13px] font-bold text-brand-ink w-full">
                        To make {p.name.split(" ")[0]} a pharmacist, enter their licence number:
                      </p>
                      <input
                        autoFocus
                        required
                        value={licenceFor.value}
                        onChange={(e) => setLicenceFor({ ...licenceFor, value: e.target.value })}
                        placeholder="Pharmacist licence number"
                        className="field !w-auto flex-1 min-w-48"
                      />
                      <button type="submit" disabled={busy === p._id} className="btn btn-teal !py-2.5 !px-4 !text-[14px] !rounded-xl disabled:opacity-50">
                        Save
                      </button>
                      <button type="button" onClick={() => setLicenceFor(null)} className="px-3 py-2 rounded-xl text-[14px] font-bold text-ink-3 hover:bg-white">
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
