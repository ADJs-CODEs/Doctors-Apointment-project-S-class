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

const field = "field";
const label = "caption";

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
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* --- who you are --- */}
        <section className="surface rounded-[24px] overflow-hidden">
          <div className="h-24 sm:h-28 bg-[radial-gradient(120%_140%_at_85%_0%,#0EA5A4_0%,#0B7C7B_30%,#0B2545_75%)]" />
          {/* only the photo overlaps the banner; the text starts below it */}
          <div className="px-5 sm:px-8 pb-6 -mt-14 sm:-mt-16 flex flex-col sm:flex-row gap-5 sm:items-start">
            <img
              src={photo}
              alt={d.name}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-[22px] object-cover object-top bg-brand-soft border-4 border-white shadow-md shrink-0"
            />
            <div className="flex-1 min-w-0 sm:pt-20">
              <h1 className="text-[28px] sm:text-[34px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink">{d.name}</h1>
              <p className="text-ink-2 font-semibold text-[15px] mt-1">
                {d.speciality} · {d.degree}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Chip icon={<RiMedalLine size={14} />}>{years(d.experience)} experience</Chip>
                <Chip icon={<RiHospitalLine size={14} />}>In person</Chip>
                {offersVideo(d) ? <Chip icon={<RiVideoChatLine size={14} />}>Video calls</Chip> : null}
                <Link
                  to="/doctor-settings"
                  className={`inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-1.5 rounded-full border ${
                    d.available ? "bg-brand-soft text-brand-ink border-teal-100" : "bg-orange-50 text-orange-700 border-orange-100"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${d.available ? "bg-brand" : "bg-orange-500"}`} />
                  {d.available ? "Taking bookings" : "Not taking bookings"}
                </Link>
              </div>
            </div>
            {!editing && (
              <button onClick={startEdit} className="btn btn-ink self-start sm:mt-20 !rounded-xl">
                <RiEdit2Line size={16} /> Edit profile
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 border-t border-line divide-x divide-line">
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
                  <p className="num text-[12px] text-ink-3 text-right mt-1">{draft.about.length}/2000</p>
                </>
              ) : (
                <p className="text-[15px] text-ink-2 leading-relaxed whitespace-pre-line">{d.about}</p>
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
                  {editing && <span className="block text-[12px] font-medium text-ink-3 mt-1">Ask the clinic admin to change this.</span>}
                </Detail>
                <Detail name="Clinic visit fee">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <span className="num text-ink-2">{currency}</span>
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
                  {d.videoFees ? `${currency}${d.videoFees}` : <span className="text-ink-3">No video calls</span>}
                  {d.videoFees && !offersVideo(d) ? (
                    <span className="block text-[12px] font-medium text-orange-700 mt-1">No video hours set, so patients can&apos;t book a video call yet.</span>
                  ) : null}
                  <Link to="/doctor-settings" className="block text-[13px] font-bold text-brand-ink hover:underline mt-1">
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
                  <p className="text-[15px] font-bold text-ink">{address || "No address yet"}</p>
                  {address && (
                    <iframe
                      title="Clinic on the map"
                      className="w-full h-56 rounded-2xl border border-line mt-3"
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
          <div className="sticky bottom-4 z-30 flex flex-col sm:flex-row gap-2 justify-end glass rounded-[20px] p-3">
            <p className="text-[14px] text-ink-2 sm:mr-auto self-center px-1">Editing your profile</p>
            <button
              onClick={() => setDraft(null)}
              className="px-5 py-3 rounded-xl border border-line bg-white text-ink-2 text-[15px] font-bold hover:bg-canvas"
            >
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="btn btn-teal !rounded-xl !px-6 disabled:opacity-50">
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
        <p className="text-[14px] text-ink-2">Every day, 10 am to 9 pm, at the clinic (the default until you set your own hours).</p>
      ) : (
        <ul className="space-y-2 text-[14px]">
          {WEEK_ORDER.map((day) => {
            const ranges = a.weekly.filter((w) => w.day === day);
            return (
              <li key={day} className="flex justify-between gap-3">
                <span className={`font-bold ${ranges.length ? "text-ink" : "text-ink-3/60"}`}>{DAYS[day].slice(0, 3)}</span>
                <span className="text-right">
                  {ranges.length ? (
                    ranges.map((r, i) => (
                      <span key={i} className="block num text-ink-2">
                        {clock(r.start)} – {clock(r.end)}
                        {r.kinds.includes("video") && <RiVideoChatLine size={13} className="inline ml-1 text-video" aria-label="video" />}
                      </span>
                    ))
                  ) : (
                    <span className="text-ink-3/60">Closed</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {a && (
        <p className="text-[13px] text-ink-3 mt-3">
          {a.slotMinutes}-minute visits
          {daysOff.length ? ` · next days off: ${daysOff.map((x) => new Date(`${x}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })).join(", ")}` : ""}
        </p>
      )}
      <Link to="/doctor-settings" className="inline-block text-[13px] font-bold text-brand-ink hover:underline mt-3">
        Change hours and days off
      </Link>
    </Card>
  );
}

/** Roughly the card patients see in the doctor list. */
function PatientPreview({ doctor, currency }: { doctor: Doctor; currency: string }) {
  return (
    <section className="btn-ink rounded-[22px] p-5">
      <p className="text-[14px] font-bold text-[#8FE3E1] mb-3">How patients see you</p>
      <div className="bg-white rounded-2xl overflow-hidden text-ink">
        <img src={doctor.image} alt="" className="w-full h-40 object-cover object-top bg-brand-soft" />
        <div className="p-4">
          <p className={`text-[12px] font-bold flex items-center gap-1.5 ${doctor.available ? "text-brand-ink" : "text-ink-3"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${doctor.available ? "bg-brand" : "bg-ink-3/50"}`} />
            {doctor.available ? "Available" : "Not available"}
          </p>
          <p className="text-[16px] font-bold mt-1">{doctor.name}</p>
          <p className="text-[13px] text-ink-3">
            {doctor.speciality} · {years(doctor.experience)}
          </p>
          <p className="text-[13px] text-ink-2 mt-2">
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

function Detail({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`${label} mb-1.5`}>{name}</p>
      <div className="text-[15px] font-bold text-ink">{children}</div>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-full bg-canvas border border-line text-ink-2">
      {icon}
      {children}
    </span>
  );
}

function Stat({ value, label: text }: { value: React.ReactNode; label: string }) {
  return (
    <div className="py-4 text-center">
      <p className="num text-[20px] text-ink">{value}</p>
      <p className="text-[13px] font-semibold text-ink-3 mt-0.5">{text}</p>
    </div>
  );
}

export default DoctorProfile;
