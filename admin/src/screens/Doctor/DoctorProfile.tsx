"use client";

import {
  RiCalendarScheduleLine,
  RiEdit2Line,
  RiHospitalLine,
  RiMapPin2Line,
  RiMedalLine,
  RiStethoscopeLine,
  RiUserHeartLine,
  RiVideoChatLine,
} from "@remixicon/react";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/lib/navigation";
import { AppContext } from "../../context/AppContext";
import { DoctorContext } from "../../context/DoctorContext";
import type { AppContextType, Doctor, DoctorContextType } from "../../types/index";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Monday first, the way people read a week
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "14:30" -> "2:30 pm" */
const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
};

/** "4year" / "4 Years" -> "4 years"; anything else is shown as typed */
const years = (text: string) => {
  const n = /^\s*(\d+)\s*(years?|yrs?)?\s*$/i.exec(text ?? "")?.[1];
  return n ? `${n} year${n === "1" ? "" : "s"}` : text;
};

/** video needs both a fee and some hours marked for video (same rule as booking) */
const offersVideo = (d: Doctor) => !!d.videoFees && !!d.availability?.weekly.some((w) => w.kinds.includes("video"));

const field =
  "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all";
const label = "text-[10px] font-black uppercase text-slate-400 tracking-wider";

type Draft = Pick<Doctor, "about" | "experience" | "degree" | "fees" | "address">;

const DoctorProfile: React.FC = () => {
  const { profileData, getProfileData, dashData, getDashData } = useContext(DoctorContext) as DoctorContextType;
  const { currency } = useContext(AppContext) as AppContextType;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dashData) getDashData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profileData) return null;
  const d = profileData;
  const editing = draft !== null;

  const startEdit = () =>
    setDraft({ about: d.about, experience: d.experience, degree: d.degree, fees: d.fees, address: { ...d.address } });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.DOCTOR.UPDATE_PROFILE, draft);
      if (data.success) {
        toast.success(data.message);
        setDraft(null);
        await getProfileData();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const address = [d.address?.line1, d.address?.line2].filter(Boolean).join(", ");
  const photo = d.image?.replace("/upload/", "/upload/f_jpg,q_auto:best/");

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* --- who you are --- */}
        <section className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-24 sm:h-28 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-800" />
          {/* only the photo overlaps the banner; the text starts below it */}
          <div className="px-5 sm:px-8 pb-6 -mt-14 sm:-mt-16 flex flex-col sm:flex-row gap-5 sm:items-start">
            <img
              src={photo}
              alt={d.name}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover object-top bg-teal-50 border-4 border-white shadow-md shrink-0"
            />
            <div className="flex-1 min-w-0 sm:pt-20">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{d.name}</h1>
              <p className="text-slate-500 font-bold text-sm">
                {d.speciality} · {d.degree}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Chip icon={<RiMedalLine size={14} />}>{years(d.experience)} experience</Chip>
                <Chip icon={<RiHospitalLine size={14} />}>In person</Chip>
                {offersVideo(d) ? <Chip icon={<RiVideoChatLine size={14} />}>Video calls</Chip> : null}
                <Link
                  to="/doctor-settings"
                  className={`inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-full ${
                    d.available ? "bg-teal-50 text-teal-700" : "bg-orange-50 text-orange-700"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${d.available ? "bg-teal-500" : "bg-orange-500"}`} />
                  {d.available ? "Taking bookings" : "Not taking bookings"}
                </Link>
              </div>
            </div>
            {!editing && (
              <button
                onClick={startEdit}
                className="self-start sm:mt-20 flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[1.5px] active:scale-95 transition-all"
              >
                <RiEdit2Line size={16} /> Edit profile
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 border-t border-slate-100 divide-x divide-slate-100">
            <Stat value={dashData ? dashData.patients : "–"} label="Patients" />
            <Stat value={dashData ? dashData.appointments : "–"} label="Bookings" />
            <Stat value={`${currency}${d.fees}`} label="Clinic fee" />
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* --- about --- */}
            <Card title="About you" icon={<RiUserHeartLine size={18} />} hint="Patients read this before they book.">
              {editing ? (
                <>
                  <textarea
                    rows={6}
                    maxLength={2000}
                    value={draft.about}
                    onChange={(e) => setDraft({ ...draft, about: e.target.value })}
                    className={`${field} resize-y leading-relaxed`}
                  />
                  <p className="text-[11px] text-slate-400 text-right mt-1">{draft.about.length}/2000</p>
                </>
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{d.about}</p>
              )}
            </Card>

            {/* --- details --- */}
            <Card title="Qualifications and fees" icon={<RiStethoscopeLine size={18} />}>
              <div className="grid sm:grid-cols-2 gap-5">
                <Detail name="Degree">
                  {editing ? (
                    <input className={field} maxLength={60} value={draft.degree} onChange={(e) => setDraft({ ...draft, degree: e.target.value })} />
                  ) : (
                    d.degree
                  )}
                </Detail>
                <Detail name="Experience">
                  {editing ? (
                    <input
                      className={field}
                      maxLength={40}
                      placeholder="e.g. 4 Years"
                      value={draft.experience}
                      onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
                    />
                  ) : (
                    years(d.experience)
                  )}
                </Detail>
                <Detail name="Speciality">
                  {d.speciality}
                  {editing && <span className="block text-[11px] font-medium text-slate-400 mt-1">Ask the clinic admin to change this.</span>}
                </Detail>
                <Detail name="Clinic visit fee">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-500">{currency}</span>
                      <input
                        type="number"
                        min={1}
                        className={field}
                        value={draft.fees}
                        onChange={(e) => setDraft({ ...draft, fees: Number(e.target.value) })}
                      />
                    </div>
                  ) : (
                    `${currency}${d.fees}`
                  )}
                </Detail>
                <Detail name="Video call fee">
                  {d.videoFees ? `${currency}${d.videoFees}` : <span className="text-slate-400">No video calls</span>}
                  {d.videoFees && !offersVideo(d) ? (
                    <span className="block text-[11px] font-medium text-orange-600 mt-1">No video hours set, so patients can&apos;t book a video call yet.</span>
                  ) : null}
                  <Link to="/doctor-settings" className="block text-[11px] font-bold text-teal-700 hover:underline mt-1">
                    Change in Settings
                  </Link>
                </Detail>
                {d.email && (
                  <Detail name="Login email">
                    <span className="break-all">{d.email}</span>
                  </Detail>
                )}
              </div>
            </Card>

            {/* --- clinic --- */}
            <Card title="Your clinic" icon={<RiMapPin2Line size={18} />} hint="Patients get directions to this address.">
              {editing ? (
                <div className="space-y-2">
                  <input
                    className={field}
                    placeholder="Street and number"
                    value={draft.address.line1}
                    onChange={(e) => setDraft({ ...draft, address: { ...draft.address, line1: e.target.value } })}
                  />
                  <input
                    className={field}
                    placeholder="Area, city"
                    value={draft.address.line2}
                    onChange={(e) => setDraft({ ...draft, address: { ...draft.address, line2: e.target.value } })}
                  />
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-800">{address || "No address yet"}</p>
                  {address && (
                    <iframe
                      title="Clinic on the map"
                      className="w-full h-56 rounded-2xl border border-slate-100 mt-3"
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                    />
                  )}
                </>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Hours doctor={d} />
            <PatientPreview doctor={d} currency={currency} />
          </div>
        </div>

        {editing && (
          <div className="sticky bottom-4 z-30 flex flex-col sm:flex-row gap-2 justify-end bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-3 shadow-lg">
            <p className="text-sm text-slate-500 sm:mr-auto self-center">Editing your profile</p>
            <button
              onClick={() => setDraft(null)}
              className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-[2px]"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="bg-teal-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-[2px] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/** The week at a glance, from the hours set in Settings. */
function Hours({ doctor }: { doctor: Doctor }) {
  const a = doctor.availability;
  const today = new Date().toISOString().slice(0, 10);
  const daysOff = (a?.daysOff ?? []).filter((x) => x >= today).sort().slice(0, 3);
  return (
    <Card title="Your hours" icon={<RiCalendarScheduleLine size={18} />}>
      {!a ? (
        <p className="text-sm text-slate-500">Every day, 10 am to 9 pm, at the clinic (the default until you set your own hours).</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {WEEK_ORDER.map((day) => {
            const ranges = a.weekly.filter((w) => w.day === day);
            return (
              <li key={day} className="flex justify-between gap-3">
                <span className={`font-bold ${ranges.length ? "text-slate-700" : "text-slate-300"}`}>{DAYS[day].slice(0, 3)}</span>
                <span className="text-right">
                  {ranges.length ? (
                    ranges.map((r, i) => (
                      <span key={i} className="block text-slate-600 tabular-nums">
                        {clock(r.start)} – {clock(r.end)}
                        {r.kinds.includes("video") && <RiVideoChatLine size={13} className="inline ml-1 text-teal-600" aria-label="video" />}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-300">Closed</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {a && (
        <p className="text-[11px] text-slate-400 mt-3">
          {a.slotMinutes}-minute visits
          {daysOff.length ? ` · next days off: ${daysOff.map((x) => new Date(`${x}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })).join(", ")}` : ""}
        </p>
      )}
      <Link to="/doctor-settings" className="inline-block text-[12px] font-bold text-teal-700 hover:underline mt-3">
        Change hours and days off
      </Link>
    </Card>
  );
}

/** Roughly the card patients see in the doctor list. */
function PatientPreview({ doctor, currency }: { doctor: Doctor; currency: string }) {
  return (
    <section className="bg-slate-900 rounded-[28px] p-5 text-white">
      <p className="text-[10px] font-black uppercase tracking-[2px] text-teal-300 mb-3">How patients see you</p>
      <div className="bg-white rounded-2xl overflow-hidden text-slate-900">
        <img src={doctor.image} alt="" className="w-full h-40 object-cover object-top bg-teal-50" />
        <div className="p-4">
          <p className={`text-[11px] font-bold flex items-center gap-1.5 ${doctor.available ? "text-teal-600" : "text-slate-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${doctor.available ? "bg-teal-500" : "bg-slate-300"}`} />
            {doctor.available ? "Available" : "Not available"}
          </p>
          <p className="font-black mt-1">{doctor.name}</p>
          <p className="text-[12px] text-slate-500">
            {doctor.speciality} · {years(doctor.experience)}
          </p>
          <p className="text-[12px] text-slate-600 mt-2">
            Clinic {currency}
            {doctor.fees}
            {offersVideo(doctor) ? ` · Video ${currency}${doctor.videoFees}` : ""}
          </p>
        </div>
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

function Detail({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`${label} mb-1.5`}>{name}</p>
      <div className="text-sm font-bold text-slate-800">{children}</div>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">
      {icon}
      {children}
    </span>
  );
}

function Stat({ value, label: text }: { value: React.ReactNode; label: string }) {
  return (
    <div className="py-4 text-center">
      <p className="text-xl font-black text-slate-900 tabular-nums">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{text}</p>
    </div>
  );
}

export default DoctorProfile;
