"use client";

import { RiAddLine, RiCalendarCloseLine, RiCloseLine, RiDeleteBinLine, RiFileCopyLine, RiHospitalLine, RiTimeLine, RiVideoOnLine } from "@remixicon/react";
import { useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppContext } from "../../context/AppContext";
import type { AppContextType } from "../../types/index";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Kind = "in-person" | "video";
type Range = { day: number; start: string; end: string; kinds: Kind[] };
export type Availability = { slotMinutes: 15 | 30 | 45 | 60; weekly: Range[]; daysOff: string[] };

/** A sensible start for a new doctor: weekdays 9 to 5 at the clinic, 30-minute visits. */
export const STARTING_HOURS: Availability = {
  slotMinutes: 30,
  weekly: [1, 2, 3, 4, 5].map((day) => ({ day, start: "09:00", end: "17:00", kinds: ["in-person"] })),
  daysOff: [],
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// show the week starting Monday
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * The doctor's bookable hours: weekly time ranges (each for clinic visits, video calls or
 * both), days off, appointment length and the video call fee. Patients can only book
 * inside these hours, and the server checks every booking against them.
 */
export default function DoctorSchedule() {
  const { currency } = useContext(AppContext) as AppContextType;
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [videoFees, setVideoFees] = useState<string>("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get(API_PATHS.DOCTOR.SCHEDULE)
      .then(({ data }) => {
        if (!data.success) return toast.error(data.message);
        setAvailability(data.availability);
        setVideoFees(data.videoFees == null ? "" : String(data.videoFees));
        setIsDefault(data.isDefault);
      })
      .catch(() => toast.error("Couldn't load your hours"));
  }, []);

  if (!availability) return <div className="h-64 rounded-[22px] bg-line/70 animate-pulse mt-8" />;

  const offersVideo = availability.weekly.some((r) => r.kinds.includes("video"));

  const save = async () => {
    if (offersVideo && !(Number(videoFees) > 0)) return toast.error("Set a video call fee to offer video call hours");
    setSaving(true);
    try {
      const { data } = await axiosInstance.put(API_PATHS.DOCTOR.SCHEDULE, {
        availability,
        videoFees: videoFees.trim() === "" ? null : Number(videoFees),
      });
      if (data.success) {
        toast.success(data.message);
        setAvailability(data.availability);
        setIsDefault(false);
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't save your hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-8 surface p-5 sm:p-7 rounded-[22px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">My hours &amp; fees</h2>
          <p className="text-[14px] text-ink-2">Patients can only book (and pay for) times inside these hours.</p>
          {isDefault && (
            <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 mt-2 inline-block">
              You haven&apos;t set your hours yet. These are the defaults (10am–9pm daily, clinic only).
            </p>
          )}
        </div>
        <button onClick={save} disabled={saving} className="btn btn-teal !rounded-xl !px-6 disabled:opacity-60">
          {saving ? "Saving…" : "Save hours"}
        </button>
      </div>

      <HoursEditor availability={availability} onChange={setAvailability} videoFees={videoFees} onVideoFees={setVideoFees} currency={currency} />
      <p className="text-[13px] text-ink-3 mt-4">
        Changing hours doesn&apos;t affect appointments already booked. Times are the clinic&apos;s local time.
      </p>
    </div>
  );
}

/**
 * The hours form on its own (video fee, visit length, weekly hours, days off), so the admin's
 * Add Doctor page can use it too. It only edits; whoever shows it decides when to save.
 */
export function HoursEditor({
  availability,
  onChange,
  videoFees,
  onVideoFees,
  currency,
}: {
  availability: Availability;
  onChange: (a: Availability) => void;
  videoFees: string;
  onVideoFees: (v: string) => void;
  currency: string;
}) {
  const [dayOff, setDayOff] = useState("");
  const set = (change: (a: Availability) => Availability) => onChange(change(structuredClone(availability)));
  const rangesFor = (day: number) => availability.weekly.map((r, i) => ({ r, i })).filter(({ r }) => r.day === day);
  const setVideoFees = onVideoFees;

  const copyMondayToWeekdays = () =>
    set((a) => {
      const monday = a.weekly.filter((r) => r.day === 1);
      a.weekly = [...a.weekly.filter((r) => r.day < 1 || r.day > 5 || r.day === 1), ...[2, 3, 4, 5].flatMap((d) => monday.map((r) => ({ ...r, day: d, kinds: [...r.kinds] })))];
      return a;
    });

  const input = "num rounded-xl border-[1.5px] border-line bg-white px-2.5 py-2 text-[14px] text-ink outline-none focus:border-brand";

  return (
    <div>
      {/* fees + length */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <label className="rounded-2xl bg-video-soft border border-violet-100 p-4">
          <span className="flex items-center gap-1.5 text-[14px] font-bold text-video">
            <RiVideoOnLine size={15} /> Video call fee
          </span>
          <span className="flex items-center gap-2 mt-2">
            <span className="num text-ink-2">{currency}</span>
            <input
              type="number"
              min={0}
              value={videoFees}
              onChange={(e) => setVideoFees(e.target.value)}
              placeholder="Not offered"
              className={`${input} w-32`}
            />
          </span>
          <span className="block text-[12px] text-ink-3 mt-1">Leave empty if you don&apos;t do video calls.</span>
        </label>
        <label className="rounded-2xl bg-canvas border border-line p-4">
          <span className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
            <RiTimeLine size={15} /> Each appointment lasts
          </span>
          <select
            value={availability.slotMinutes}
            onChange={(e) => set((a) => ((a.slotMinutes = Number(e.target.value) as Availability["slotMinutes"]), a))}
            className={`${input} mt-2`}
          >
            {[15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m === 60 ? "1 hour" : `${m} minutes`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* weekly hours */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[16px] font-bold text-ink">Weekly hours</p>
        <button type="button" onClick={copyMondayToWeekdays} className="flex items-center gap-1 text-[13px] font-bold text-brand-ink hover:underline">
          <RiFileCopyLine size={14} /> Copy Monday to all weekdays
        </button>
      </div>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {ORDER.map((day) => {
          const ranges = rangesFor(day);
          return (
            <div key={day} className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4">
              <p className={`w-28 shrink-0 text-[15px] font-bold ${ranges.length ? "text-ink" : "text-ink-3/60"}`}>{DAYS[day]}</p>
              <div className="flex-1 space-y-2">
                {ranges.length === 0 && <p className="text-[14px] text-ink-3">Not working</p>}
                {ranges.map(({ r, i }) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input type="time" value={r.start} onChange={(e) => set((a) => ((a.weekly[i].start = e.target.value), a))} className={input} />
                    <span className="text-ink-3 text-[14px]">to</span>
                    <input type="time" value={r.end} onChange={(e) => set((a) => ((a.weekly[i].end = e.target.value), a))} className={input} />
                    {(
                      [
                        { kind: "in-person" as const, label: "Clinic", icon: RiHospitalLine, on: "bg-brand-ink text-white border-brand-ink" },
                        { kind: "video" as const, label: "Video", icon: RiVideoOnLine, on: "bg-video text-white border-video" },
                      ]
                    ).map(({ kind, label, icon: Icon, on }) => {
                      const active = r.kinds.includes(kind);
                      return (
                        <button
                          type="button"
                          key={kind}
                          onClick={() =>
                            set((a) => {
                              const k = a.weekly[i].kinds;
                              a.weekly[i].kinds = active ? k.filter((x) => x !== kind) : [...k, kind];
                              return a;
                            })
                          }
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-bold border ${active ? on : "bg-white text-ink-3 border-line"}`}
                        >
                          <Icon size={13} /> {label}
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => set((a) => (a.weekly.splice(i, 1), a))} className="p-1.5 rounded-lg text-ink-3 hover:text-rose-600 hover:bg-rose-50" aria-label="Remove these hours">
                      <RiDeleteBinLine size={16} />
                    </button>
                    {r.start >= r.end && <span className="text-[12px] font-bold text-rose-600">End must be after start</span>}
                    {r.kinds.length === 0 && <span className="text-[12px] font-bold text-rose-600">Pick clinic and/or video</span>}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set((a) => (a.weekly.push({ day, start: "09:00", end: "17:00", kinds: ["in-person"] }), a))}
                  className="flex items-center gap-1 text-[13px] font-bold text-ink-3 hover:text-brand-ink"
                >
                  <RiAddLine size={15} /> Add hours
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* days off */}
      <p className="text-[16px] font-bold text-ink mt-6 mb-2">Days off</p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={dayOff} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDayOff(e.target.value)} className={input} />
        <button
          type="button"
          onClick={() => {
            if (!dayOff) return;
            set((a) => ((a.daysOff = [...new Set([...a.daysOff, dayOff])].sort()), a));
            setDayOff("");
          }}
          className="btn btn-ink !py-2 !px-3 !text-[13px] !rounded-xl"
        >
          <RiCalendarCloseLine size={14} /> Add day off
        </button>
        {availability.daysOff
          .filter((d) => d >= new Date().toISOString().slice(0, 10))
          .map((d) => (
            <span key={d} className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-canvas border border-line text-[13px] font-semibold text-ink-2">
              {new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              <button type="button" onClick={() => set((a) => ((a.daysOff = a.daysOff.filter((x) => x !== d)), a))} className="p-0.5 rounded-full text-ink-3 hover:bg-line" aria-label="Remove day off">
                <RiCloseLine size={14} />
              </button>
            </span>
          ))}
      </div>
    </div>
  );
}
