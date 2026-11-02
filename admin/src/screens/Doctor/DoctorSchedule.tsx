"use client";

import { RiAddLine, RiCalendarCloseLine, RiDeleteBinLine, RiFileCopyLine, RiHospitalLine, RiTimeLine, RiVideoOnLine } from "@remixicon/react";
import { useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppContext } from "../../context/AppContext";
import type { AppContextType } from "../../types/index";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Kind = "in-person" | "video";
type Range = { day: number; start: string; end: string; kinds: Kind[] };
type Availability = { slotMinutes: 15 | 30 | 45 | 60; weekly: Range[]; daysOff: string[] };

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
  const [dayOff, setDayOff] = useState("");
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

  if (!availability) return <div className="h-64 rounded-[32px] bg-slate-100 animate-pulse mt-8" />;

  const set = (change: (a: Availability) => Availability) => setAvailability((a) => (a ? change(structuredClone(a)) : a));
  const rangesFor = (day: number) => availability.weekly.map((r, i) => ({ r, i })).filter(({ r }) => r.day === day);
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

  const copyMondayToWeekdays = () =>
    set((a) => {
      const monday = a.weekly.filter((r) => r.day === 1);
      a.weekly = [...a.weekly.filter((r) => r.day < 1 || r.day > 5 || r.day === 1), ...[2, 3, 4, 5].flatMap((d) => monday.map((r) => ({ ...r, day: d, kinds: [...r.kinds] })))];
      return a;
    });

  const input = "rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-teal-400";

  return (
    <div className="mt-8 bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">My hours &amp; fees</h2>
          <p className="text-sm text-slate-500">Patients can only book (and pay for) times inside these hours.</p>
          {isDefault && (
            <p className="text-[12px] text-amber-700 bg-amber-50 rounded-xl px-3 py-1.5 mt-2 inline-block">
              You haven&apos;t set your hours yet. These are the defaults (10am–9pm daily, clinic only).
            </p>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 rounded-2xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save hours"}
        </button>
      </div>

      {/* fees + length */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <label className="rounded-2xl bg-violet-50/60 border border-violet-100 p-4">
          <span className="flex items-center gap-1.5 text-[12px] font-black text-violet-800">
            <RiVideoOnLine size={15} /> Video call fee
          </span>
          <span className="flex items-center gap-2 mt-2">
            <span className="font-black text-slate-700">{currency}</span>
            <input
              type="number"
              min={0}
              value={videoFees}
              onChange={(e) => setVideoFees(e.target.value)}
              placeholder="Not offered"
              className={`${input} w-32`}
            />
          </span>
          <span className="block text-[11px] text-slate-500 mt-1">Leave empty if you don&apos;t do video calls.</span>
        </label>
        <label className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
          <span className="flex items-center gap-1.5 text-[12px] font-black text-slate-700">
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
        <p className="text-[11px] font-black uppercase tracking-[2px] text-slate-400">Weekly hours</p>
        <button onClick={copyMondayToWeekdays} className="flex items-center gap-1 text-[12px] font-bold text-teal-600 hover:text-teal-700">
          <RiFileCopyLine size={14} /> Copy Monday to all weekdays
        </button>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
        {ORDER.map((day) => {
          const ranges = rangesFor(day);
          return (
            <div key={day} className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4">
              <p className={`w-28 shrink-0 text-sm font-black ${ranges.length ? "text-slate-900" : "text-slate-300"}`}>{DAYS[day]}</p>
              <div className="flex-1 space-y-2">
                {ranges.length === 0 && <p className="text-sm text-slate-400">Not working</p>}
                {ranges.map(({ r, i }) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input type="time" value={r.start} onChange={(e) => set((a) => ((a.weekly[i].start = e.target.value), a))} className={input} />
                    <span className="text-slate-400 text-sm">to</span>
                    <input type="time" value={r.end} onChange={(e) => set((a) => ((a.weekly[i].end = e.target.value), a))} className={input} />
                    {(
                      [
                        { kind: "in-person" as const, label: "Clinic", icon: RiHospitalLine, on: "bg-teal-600 text-white border-teal-600" },
                        { kind: "video" as const, label: "Video", icon: RiVideoOnLine, on: "bg-violet-600 text-white border-violet-600" },
                      ]
                    ).map(({ kind, label, icon: Icon, on }) => {
                      const active = r.kinds.includes(kind);
                      return (
                        <button
                          key={kind}
                          onClick={() =>
                            set((a) => {
                              const k = a.weekly[i].kinds;
                              a.weekly[i].kinds = active ? k.filter((x) => x !== kind) : [...k, kind];
                              return a;
                            })
                          }
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${active ? on : "bg-white text-slate-400 border-slate-200"}`}
                        >
                          <Icon size={13} /> {label}
                        </button>
                      );
                    })}
                    <button onClick={() => set((a) => (a.weekly.splice(i, 1), a))} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50" aria-label="Remove these hours">
                      <RiDeleteBinLine size={16} />
                    </button>
                    {r.start >= r.end && <span className="text-[11px] font-bold text-red-500">End must be after start</span>}
                    {r.kinds.length === 0 && <span className="text-[11px] font-bold text-red-500">Pick clinic and/or video</span>}
                  </div>
                ))}
                <button
                  onClick={() => set((a) => (a.weekly.push({ day, start: "09:00", end: "17:00", kinds: ["in-person"] }), a))}
                  className="flex items-center gap-1 text-[12px] font-bold text-slate-500 hover:text-teal-600"
                >
                  <RiAddLine size={15} /> Add hours
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* days off */}
      <p className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 mt-6 mb-2">Days off</p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={dayOff} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDayOff(e.target.value)} className={input} />
        <button
          onClick={() => {
            if (!dayOff) return;
            set((a) => ((a.daysOff = [...new Set([...a.daysOff, dayOff])].sort()), a));
            setDayOff("");
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700"
        >
          <RiCalendarCloseLine size={14} /> Add day off
        </button>
        {availability.daysOff
          .filter((d) => d >= new Date().toISOString().slice(0, 10))
          .map((d) => (
            <span key={d} className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">
              {new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              <button onClick={() => set((a) => ((a.daysOff = a.daysOff.filter((x) => x !== d)), a))} className="p-0.5 rounded-full hover:bg-slate-200" aria-label="Remove day off">
                ✕
              </button>
            </span>
          ))}
      </div>
      <p className="text-[12px] text-slate-400 mt-4">
        Changing hours doesn&apos;t affect appointments already booked. Times are the clinic&apos;s local time.
      </p>
    </div>
  );
}
