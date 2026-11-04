"use client";

import {
  RiCalendarScheduleLine,
  RiCheckboxCircleLine,
  RiFileCopyLine,
  RiImageAddLine,
  RiLockPasswordLine,
  RiMapPin2Line,
  RiStethoscopeLine,
} from "@remixicon/react";
import React, { type FormEvent, useContext, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/lib/navigation";
import { PageHeader } from "../../components/panel";
import { AppContext } from "../../context/AppContext";
import type { AppContextType } from "../../types/index";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import { type Availability, HoursEditor, STARTING_HOURS } from "../Doctor/DoctorSchedule";

// the patient site filters doctors by these exact names
const SPECIALITIES = ["General physician", "Gynecologist", "Dermatologist", "Pediatricians", "Neurologist", "Gastroenterologist"];
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const field = "field";
const label = "block caption mb-1.5";

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
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          eyebrow="The clinic"
          title="Add a doctor"
          subtitle="Their profile, fees and hours. They get their login by email and choose their own password at first sign-in."
        />

        {added && <Added login={added} onClose={() => setAdded(null)} />}

        <form onSubmit={submit} className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* photo and bookings */}
            <div className="space-y-6">
              <Card title="Photo" icon={<RiImageAddLine size={18} />} hint="JPG, PNG or WebP, up to 3 MB. Patients see it on the doctor list.">
                <label className="block cursor-pointer group">
                  <div className="aspect-square rounded-[20px] bg-canvas border-2 border-dashed border-line group-hover:border-brand overflow-hidden flex items-center justify-center">
                    {photo ? (
                      <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="text-center text-ink-3">
                        <RiImageAddLine size={32} className="mx-auto" />
                        <p className="text-[14px] font-bold mt-2">Choose a photo</p>
                      </div>
                    )}
                  </div>
                  <input type="file" accept={PHOTO_TYPES.join(",")} hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
                </label>
                {photo && <p className="text-[13px] text-ink-3 mt-2 truncate">{photo.name}</p>}
              </Card>

              <div className="surface rounded-[22px] p-5 flex items-start gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={available}
                  onClick={() => setAvailable(!available)}
                  className={`mt-0.5 w-11 h-6 rounded-full shrink-0 transition-colors relative ${available ? "bg-brand" : "bg-line"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${available ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <div>
                  <p className="font-bold text-ink text-[15px]">Taking bookings straight away</p>
                  <p className="text-[13px] text-ink-3">Turn off to add them hidden from booking until they&apos;re ready. They can switch it on in Settings.</p>
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
                    <p className="num text-[12px] text-ink-3 text-right mt-1">{form.about.length}/2000</p>
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
                    <span className="num text-ink-2">{currency}</span>
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
            <label className="flex items-center gap-2 text-[15px] font-bold text-ink-2 mb-4 cursor-pointer">
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

          <div className="sticky bottom-4 z-30 flex flex-col sm:flex-row gap-3 sm:items-center glass rounded-[20px] p-3">
            <p className="text-[14px] text-ink-2 sm:mr-auto px-1">
              {form.name ? `Adding ${form.name}` : "Fill in the doctor's details"} · their login is emailed when you add them
            </p>
            <button type="submit" disabled={saving} className="btn btn-teal !rounded-xl !px-7 disabled:opacity-50">
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
    <section className="bg-brand-soft border border-teal-200 rounded-[22px] p-5 sm:p-6">
      <p className="font-bold text-[16px] text-brand-ink flex items-center gap-2">
        <RiCheckboxCircleLine size={20} /> {login.name} has been added
      </p>
      <p className="text-[14px] text-ink-2 mt-1">
        We emailed their login. If it doesn&apos;t arrive, give them these. This is the only time the password is shown.
      </p>
      <div className="mt-3 bg-white rounded-2xl border border-teal-100 px-4 py-3 text-[14px] grid sm:grid-cols-2 gap-2">
        <p>
          <span className="caption">Email</span> <span className="font-bold text-ink break-all">{login.email}</span>
        </p>
        <p>
          <span className="caption">Starting password</span> <span className="num text-ink">{login.startingPassword}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" onClick={copy} className="btn btn-teal !py-2 !px-4 !text-[14px] !rounded-xl">
          <RiFileCopyLine size={15} /> Copy login
        </button>
        <Link to="/doctor-list" className="px-4 py-2 rounded-xl border border-teal-200 bg-white text-brand-ink text-[14px] font-bold hover:bg-teal-50">
          See all doctors
        </Link>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-[14px] font-bold text-brand-ink hover:bg-teal-100">
          Add another
        </button>
      </div>
    </section>
  );
}

function Card({ title, icon, hint, children }: { title: string; icon: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <section className="surface rounded-[22px] p-5 sm:p-6">
      <div className="mb-4">
        <p className="font-bold text-[16px] text-ink flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-[10px] grid place-items-center border border-teal-100 bg-brand-soft text-brand-ink">{icon}</span> {title}
        </p>
        {hint && <p className="text-[13px] text-ink-3 mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default AddDoctor;
