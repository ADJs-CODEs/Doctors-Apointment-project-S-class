"use client";

import {
  RiCalendarScheduleLine,
  RiCheckboxCircleLine,
  RiFileCopyLine,
  RiImageAddLine,
  RiLockPasswordLine,
  RiMapPin2Line,
  RiStethoscopeLine,
  RiUserAddLine,
} from "@remixicon/react";
import React, { type FormEvent, useContext, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/lib/navigation";
import { AppContext } from "../../context/AppContext";
import type { AppContextType } from "../../types/index";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import { type Availability, HoursEditor, STARTING_HOURS } from "../Doctor/DoctorSchedule";

// the patient site filters doctors by these exact names
const SPECIALITIES = ["General physician", "Gynecologist", "Dermatologist", "Pediatricians", "Neurologist", "Gastroenterologist"];
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const field = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all";
const label = "block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5";

const EMPTY = { name: "", email: "", password: "", speciality: SPECIALITIES[0], degree: "", years: "1", fee: "", about: "", line1: "", line2: "" };

/** The admin adds a doctor: who they are, fees, hours, and a login that's emailed to them. */
const AddDoctor: React.FC = () => {
  const { currency } = useContext(AppContext) as AppContextType;
  const [photo, setPhoto] = useState<File | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [available, setAvailable] = useState(true);
  const [setHours, setSetHours] = useState(true);
  const [hours, setHoursValue] = useState<Availability>(STARTING_HOURS);
  const [videoFees, setVideoFees] = useState("");
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<{ name: string; email: string; startingPassword: string } | null>(null);

  const change = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const pickPhoto = (file?: File) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return toast.error("Use a JPG, PNG or WebP photo");
    if (file.size > 3 * 1024 * 1024) return toast.error("The photo must be 3 MB or smaller");
    setPhoto(file);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!photo) return toast.error("Add a photo of the doctor");
    const offersVideo = setHours && hours.weekly.some((r) => r.kinds.includes("video"));
    if (offersVideo && !(Number(videoFees) > 0)) return toast.error("Set a video fee to offer video call hours");
    if (setHours && hours.weekly.length === 0) return toast.error("Give the doctor at least one block of working hours");

    const years = Math.max(1, Math.round(Number(form.years) || 1));
    const data = new FormData();
    data.append("image", photo);
    data.append("name", form.name);
    data.append("email", form.email);
    if (form.password) data.append("password", form.password);
    data.append("speciality", form.speciality);
    data.append("degree", form.degree);
    data.append("experience", `${years} Year${years === 1 ? "" : "s"}`);
    data.append("fees", form.fee);
    data.append("about", form.about);
    data.append("address", JSON.stringify({ line1: form.line1, line2: form.line2 }));
    data.append("available", String(available));
    if (videoFees.trim()) data.append("videoFees", videoFees);
    if (setHours) data.append("availability", JSON.stringify(hours));

    setSaving(true);
    try {
      // multipart, or the shared client (JSON by default) would drop the photo
      const { data: res } = await axiosInstance.post(API_PATHS.ADMIN.ADD_DOCTORS, data, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.success) {
        toast.success(res.message);
        setAdded({ name: form.name, ...res.login });
        setForm(EMPTY);
        setPhoto(null);
        setAvailable(true);
        setHoursValue(STARTING_HOURS);
        setVideoFees("");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else toast.error(res.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
              <RiUserAddLine size={20} />
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900">
              Add a doctor
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">Their profile, fees and hours. They get their login by email and choose their own password at first sign-in.</p>
        </div>

        {added && <Added login={added} onClose={() => setAdded(null)} />}

        <form onSubmit={submit} className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* photo and bookings */}
            <div className="space-y-6">
              <Card title="Photo" icon={<RiImageAddLine size={18} />} hint="JPG, PNG or WebP, up to 3 MB. Patients see it on the doctor list.">
                <label className="block cursor-pointer group">
                  <div className="aspect-square rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 group-hover:border-teal-400 overflow-hidden flex items-center justify-center">
                    {photo ? (
                      <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="text-center text-slate-400">
                        <RiImageAddLine size={32} className="mx-auto" />
                        <p className="text-[12px] font-bold mt-2">Choose a photo</p>
                      </div>
                    )}
                  </div>
                  <input type="file" accept={PHOTO_TYPES.join(",")} hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
                </label>
                {photo && <p className="text-[11px] text-slate-400 mt-2 truncate">{photo.name}</p>}
              </Card>

              <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 flex items-start gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={available}
                  onClick={() => setAvailable(!available)}
                  className={`mt-0.5 w-11 h-6 rounded-full shrink-0 transition-colors relative ${available ? "bg-teal-500" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${available ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <div>
                  <p className="font-black text-slate-900 text-sm">Taking bookings straight away</p>
                  <p className="text-[12px] text-slate-500">Turn off to add them hidden from booking until they&apos;re ready. They can switch it on in Settings.</p>
                </div>
              </div>
            </div>

            {/* who they are */}
            <div className="lg:col-span-2">
              <Card title="About the doctor" icon={<RiStethoscopeLine size={18} />}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <span className={label}>Full name</span>
                    <input required maxLength={80} value={form.name} onChange={change("name")} className={field} placeholder="Dr Ada Obi" />
                  </div>
                  <div>
                    <span className={label}>Speciality</span>
                    <select value={form.speciality} onChange={change("speciality")} className={field}>
                      {SPECIALITIES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={label}>Degree</span>
                    <input required maxLength={60} value={form.degree} onChange={change("degree")} className={field} placeholder="MBBS, MD" />
                  </div>
                  <div>
                    <span className={label}>Years of experience</span>
                    <input required type="number" min={1} max={60} value={form.years} onChange={change("years")} className={field} />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>About them</span>
                    <textarea
                      required
                      minLength={20}
                      maxLength={2000}
                      rows={5}
                      value={form.about}
                      onChange={change("about")}
                      className={`${field} resize-y leading-relaxed`}
                      placeholder="What they treat, their approach, languages they speak… Patients read this before they book."
                    />
                    <p className="text-[11px] text-slate-400 text-right mt-1">{form.about.length}/2000</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Clinic and fee" icon={<RiMapPin2Line size={18} />} hint="Patients get directions to this address.">
              <div className="space-y-4">
                <div>
                  <span className={label}>Clinic visit fee</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-500">{currency}</span>
                    <input required type="number" min={1} step="0.01" value={form.fee} onChange={change("fee")} className={field} placeholder="50" />
                  </div>
                </div>
                <div>
                  <span className={label}>Address</span>
                  <input required maxLength={200} value={form.line1} onChange={change("line1")} className={`${field} mb-2`} placeholder="Street and number" />
                  <input maxLength={200} value={form.line2} onChange={change("line2")} className={field} placeholder="Area, city" />
                </div>
              </div>
            </Card>

            <Card title="Their login" icon={<RiLockPasswordLine size={18} />} hint="We email these to the doctor. They must pick their own password when they first log in.">
              <div className="space-y-4">
                <div>
                  <span className={label}>Email</span>
                  <input required type="email" maxLength={120} value={form.email} onChange={change("email")} className={field} placeholder="ada.obi@example.com" />
                </div>
                <div>
                  <span className={label}>Starting password (optional)</span>
                  <input
                    type="text"
                    minLength={8}
                    maxLength={100}
                    autoComplete="off"
                    value={form.password}
                    onChange={change("password")}
                    className={field}
                    placeholder="Leave empty and we'll make one up"
                  />
                </div>
              </div>
            </Card>
          </div>

          <Card title="Hours and video calls" icon={<RiCalendarScheduleLine size={18} />} hint="Patients can only book inside these hours. The doctor can change them later in Settings.">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4 cursor-pointer">
              <input type="checkbox" checked={setHours} onChange={(e) => setSetHours(e.target.checked)} className="w-4 h-4 accent-teal-600" />
              Set their hours now
            </label>
            {setHours ? (
              <HoursEditor availability={hours} onChange={setHoursValue} videoFees={videoFees} onVideoFees={setVideoFees} currency={currency} />
            ) : (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                Until the doctor sets their own hours, patients can book them every day from 10 am to 9 pm, at the clinic only.
              </p>
            )}
          </Card>

          <div className="sticky bottom-4 z-30 flex flex-col sm:flex-row gap-3 sm:items-center bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-3 shadow-lg">
            <p className="text-sm text-slate-500 sm:mr-auto">
              {form.name ? `Adding ${form.name}` : "Fill in the doctor's details"} · their login is emailed when you add them
            </p>
            <button type="submit" disabled={saving} className="bg-teal-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[11px] tracking-[2px] disabled:opacity-50">
              {saving ? "Adding…" : "Add doctor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/** Shown once after adding: the login, in case the email doesn't arrive. */
function Added({ login, onClose }: { login: { name: string; email: string; startingPassword: string }; onClose: () => void }) {
  const copy = () => {
    navigator.clipboard
      .writeText(`Email: ${login.email}\nStarting password: ${login.startingPassword}`)
      .then(() => toast.success("Copied"))
      .catch(() => toast.error("Couldn't copy"));
  };
  return (
    <section className="bg-teal-50 border border-teal-200 rounded-[28px] p-5 sm:p-6">
      <p className="font-black text-teal-900 flex items-center gap-2">
        <RiCheckboxCircleLine size={20} /> {login.name} has been added
      </p>
      <p className="text-sm text-teal-800 mt-1">
        We emailed their login. If it doesn&apos;t arrive, give them these. This is the only time the password is shown.
      </p>
      <div className="mt-3 bg-white rounded-2xl border border-teal-100 px-4 py-3 text-sm grid sm:grid-cols-2 gap-2">
        <p>
          <span className="text-slate-400 font-bold">Email</span> <span className="font-black text-slate-900 break-all">{login.email}</span>
        </p>
        <p>
          <span className="text-slate-400 font-bold">Starting password</span> <span className="font-mono font-black text-slate-900">{login.startingPassword}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" onClick={copy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold">
          <RiFileCopyLine size={15} /> Copy login
        </button>
        <Link to="/doctor-list" className="px-4 py-2 rounded-xl border border-teal-200 text-teal-800 text-sm font-bold hover:bg-teal-100">
          See all doctors
        </Link>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-teal-700 hover:bg-teal-100">
          Add another
        </button>
      </div>
    </section>
  );
}

function Card({ title, icon, hint, children }: { title: string; icon: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 sm:p-6">
      <div className="mb-4">
        <p className="font-black text-slate-900 flex items-center gap-2">
          <span className="text-teal-600">{icon}</span> {title}
        </p>
        {hint && <p className="text-[12px] text-slate-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default AddDoctor;
