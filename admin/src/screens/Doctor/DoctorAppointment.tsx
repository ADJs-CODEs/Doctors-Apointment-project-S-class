"use client";

import React, { useMemo, useState } from "react";
import {
  RiUserUnfollowLine,
  RiVideoOnLine,
  RiHospitalLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiErrorWarningFill,
  RiCalendarCheckLine,
  RiChat3Line,
  RiArrowDownSLine,
  RiShieldCheckLine,
  RiStethoscopeLine,
} from "@remixicon/react";
import { toast } from "sonner";
import useDoctorAppointment from "../../hooks/useDoctorAppointment";
import { useDoctorMessages } from "../../context/DoctorMessagesContext";
import { useNavigate } from "@/lib/navigation";
import DoctorsAdherenceView from "../../layout/DoctorsAdherenceView";
import DoctorsAppointmentModal from "../../Modal/DoctorsAppointmentModal";
import DoctorsPrescribeModal from "../../Modal/DoctorsPrescribeModal";
import MissedAppointmentModal, { canMarkMissed, MissedBadge } from "../../Modal/MissedAppointmentModal";
import JoinCallButton from "../../components/JoinCallButton";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import type { Appointment } from "../../types/index";

type Tab = "upcoming" | "toClose" | "attention" | "completed" | "closed";

// a visit counts as "upcoming" until an hour after it starts; after that it needs closing
const STILL_UPCOMING_MS = 60 * 60_000;

/** The patient's photo, or their initials when there isn't one (or it won't load). */
function Avatar({ src, name }: { src?: string; name: string }) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (!src || broken) {
    return <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 font-black flex items-center justify-center shrink-0">{initials || "?"}</div>;
  }
  return <img className="w-12 h-12 rounded-2xl object-cover bg-slate-100 shrink-0" src={src} alt="" onError={() => setBroken(true)} />;
}

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "6_4_2026" + "02:30 PM" -> a Date in local time (for sorting and the Today/Tomorrow headings). */
function slotStart(a: Appointment) {
  const [d, m, y] = a.slotDate.split("_").map(Number);
  const t = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(a.slotTime.trim());
  if (!d || !m || !y) return new Date(0);
  let h = t ? Number(t[1]) % 12 : 0;
  if (t && t[3].toLowerCase() === "pm") h += 12;
  return new Date(y, m - 1, d, h, t ? Number(t[2]) : 0);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
function dayHeading(d: Date) {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

const isOpen = (a: Appointment) => !a.isCompleted && !a.cancelled && !a.missed;
const earlyDose = (a: Appointment) => !!a.healthData?.prescribedMedicines?.some((m) => m.overdoseAlert);
const isCritical = (a: Appointment) => a.patientStatus === "Critical" || earlyDose(a);

/** Why this patient needs attention, in words. */
const criticalReason = (a: Appointment) =>
  earlyDose(a) && a.patientStatus === "Critical"
    ? "Took a dose early, and marked critical"
    : earlyDose(a)
      ? "Took a dose early"
      : "Marked critical (urgent message)";

const DoctorAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { forPatient } = useDoctorMessages();
  const [noShowFor, setNoShowFor] = useState<Appointment | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [resolving, setResolving] = useState<string | null>(null);
  const {
    appointments,
    setExpandedId,
    expandedId,
    calculateAge,
    currency,
    setProgress,
    cancelAppointment,
    setSelectedApptId,
    setShowModal,
    setShowAlertModal,
    getAdherenceStats,
    alertForm,
    setAlertForm,
    showAlertModal,
    isSendingAlert,
    handleSendAlert,
    showModal,
    resetForm,
    vitals,
    setVitals,
    setMedicines,
    medicines,
    completeAppointment,
    getAppointments,
    selectedApptId,
  } = useDoctorAppointment();

  const all = appointments ?? [];
  const lists = useMemo(() => {
    const byTimeAsc = (a: Appointment, b: Appointment) => slotStart(a).getTime() - slotStart(b).getTime();
    const byTimeDesc = (a: Appointment, b: Appointment) => -byTimeAsc(a, b);
    const cutoff = Date.now() - STILL_UPCOMING_MS;
    return {
      upcoming: all.filter((a) => isOpen(a) && slotStart(a).getTime() >= cutoff).sort(byTimeAsc),
      // their time has passed but nobody marked them completed or a no-show
      toClose: all.filter((a) => isOpen(a) && slotStart(a).getTime() < cutoff).sort(byTimeDesc),
      attention: all.filter((a) => isCritical(a) && !a.cancelled).sort(byTimeDesc),
      completed: all.filter((a) => a.isCompleted).sort(byTimeDesc),
      closed: all.filter((a) => a.cancelled || a.missed).sort(byTimeDesc),
    };
  }, [all]);

  const shown = lists[tab];
  const tabs: { id: Tab; label: string; count: number; tone?: string }[] = [
    { id: "upcoming", label: "Upcoming", count: lists.upcoming.length },
    { id: "toClose", label: "To close", count: lists.toClose.length, tone: "bg-orange-500 text-white" },
    { id: "attention", label: "Needs attention", count: lists.attention.length, tone: "bg-rose-500 text-white" },
    { id: "completed", label: "Completed", count: lists.completed.length },
    { id: "closed", label: "Cancelled & missed", count: lists.closed.length },
  ];

  const resolve = async (a: Appointment) => {
    setResolving(a.userId);
    try {
      const { data } = await axiosInstance.post(API_PATHS.DOCTOR.RESOLVE_CRITICAL, { userId: a.userId });
      if (data.success) {
        toast.success(`${a.userData.name} is no longer marked critical`);
        await getAppointments();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setResolving(null);
    }
  };

  // upcoming visits get day headings (Today, Tomorrow, ...); the others are a plain list
  let lastDay = "";

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
            <RiCalendarCheckLine size={20} />
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900">
            Patient <span className="text-teal-500 font-serif italic normal-case">Schedule</span>
          </h1>
        </div>
        <p className="text-slate-500 text-sm ml-12 mb-6">Your visits, soonest first. Complete each one with vitals and prescriptions.</p>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                tab === t.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center ${
                    t.tone ?? (tab === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-100 py-16 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 mx-auto">
              <RiCalendarCheckLine size={24} />
            </div>
            <p className="font-black text-slate-900">
              {tab === "upcoming"
                ? "No upcoming visits"
                : tab === "toClose"
                  ? "All your visits are closed"
                  : tab === "attention"
                    ? "Nobody needs attention"
                    : "Nothing here"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {tab === "upcoming"
                ? "New bookings appear here as soon as they're paid."
                : tab === "toClose"
                  ? "Visits whose time has passed show up here until you complete them or mark a no-show."
                  : tab === "attention"
                    ? "Patients flagged critical will show up here."
                    : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tab === "toClose" && (
              <p className="text-[13px] text-orange-800 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                These visits&apos; time has passed. Complete each one, or mark a no-show. A visit still open 24 hours after its time counts as missed by you, and
                the patient is refunded in full.
              </p>
            )}
            {shown.map((item) => {
              const start = slotStart(item);
              const heading = tab === "upcoming" ? dayHeading(start) : "";
              const showHeading = tab === "upcoming" && heading !== lastDay;
              lastDay = heading;
              const critical = isCritical(item);
              const age = calculateAge(item.userData.dob);
              const open = isOpen(item);

              return (
                <React.Fragment key={item._id}>
                  {showHeading && <p className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 pt-3 px-1">{heading}</p>}

                  <div className={`bg-white rounded-[24px] border overflow-hidden ${critical ? "border-rose-200" : "border-slate-200"}`}>
                    {critical && (
                      <div className="flex flex-wrap items-center gap-2 bg-rose-50 px-4 sm:px-5 py-2.5 border-b border-rose-100">
                        <RiErrorWarningFill size={16} className="text-rose-600" />
                        <p className="text-[12px] font-bold text-rose-800 flex-1">Needs attention: {criticalReason(item)}</p>
                        <button
                          onClick={() => resolve(item)}
                          disabled={resolving === item.userId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-[12px] font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <RiShieldCheckLine size={14} /> {resolving === item.userId ? "Saving…" : "Mark as resolved"}
                        </button>
                      </div>
                    )}

                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
                      {/* when */}
                      <div className="flex md:flex-col items-center md:items-center gap-3 md:gap-0 md:w-20 shrink-0">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center">
                          <span className="text-xl font-black leading-none">{start.getDate()}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">{MONTH[start.getMonth()]}</span>
                        </div>
                        <p className="text-sm font-black text-slate-800 md:mt-1.5">{item.slotTime}</p>
                      </div>

                      {/* who and what */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar src={item.userData.image} name={item.userData.name} />
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 truncate">{item.userData.name}</p>
                          <p className="text-[12px] text-slate-500">{Number.isFinite(age) && age > 0 ? `${age} years old` : "Age not given"}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {item.kind === "video" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-violet-600 px-2 py-0.5 rounded-full">
                                <RiVideoOnLine size={12} /> Video call
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                                <RiHospitalLine size={12} /> At the clinic
                              </span>
                            )}
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                !item.payment ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {!item.payment
                                ? "Not paid yet"
                                : `Paid ${currency}${Number(item.amount).toLocaleString("en-US")} · ${item.paymentMethod === "wallet" ? "wallet" : "card"}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* what they can do */}
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {item.kind === "video" && open && <JoinCallButton appointment={item} />}
                        {!item.cancelled && (
                          <button
                            onClick={() => navigate(`/doctor-messages?patient=${item.userId}&appointment=${item._id}`)}
                            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <RiChat3Line size={16} /> Message
                            {forPatient(item.userId) > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-teal-500 border-2 border-white" />}
                          </button>
                        )}
                        {item.missed ? (
                          <MissedBadge item={item} currency={currency} />
                        ) : item.cancelled ? (
                          <span className="text-[12px] font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">Cancelled</span>
                        ) : item.isCompleted ? (
                          <button
                            onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 border border-teal-100 text-[13px] font-bold text-teal-800 hover:bg-teal-100"
                          >
                            <RiCheckboxCircleLine size={16} /> {expandedId === item._id ? "Hide report" : "Report & adherence"}
                            <RiArrowDownSLine size={16} className={`transition-transform ${expandedId === item._id ? "rotate-180" : ""}`} />
                          </button>
                        ) : (
                          <>
                            {canMarkMissed(item) && (
                              <button
                                onClick={() => setNoShowFor(item)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 text-[13px] font-bold text-orange-700 hover:bg-orange-50"
                              >
                                <RiUserUnfollowLine size={16} /> No-show
                              </button>
                            )}
                            <button
                              onClick={() => cancelAppointment(item._id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                            >
                              <RiCloseCircleLine size={16} /> Cancel
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApptId(item._id);
                                setShowModal(true);
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-[13px] font-black text-white hover:bg-teal-700"
                            >
                              <RiStethoscopeLine size={16} /> Complete visit
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* vitals, prescriptions and dose adherence for completed visits */}
                    <DoctorsAdherenceView
                      item={item}
                      expandedId={expandedId}
                      setSelectedApptId={setSelectedApptId}
                      setShowAlertModal={setShowAlertModal}
                      getAdherenceStats={getAdherenceStats}
                    />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <DoctorsAppointmentModal
        showAlertModal={showAlertModal}
        alertForm={alertForm}
        setAlertForm={setAlertForm}
        isSendingAlert={isSendingAlert}
        handleSendAlert={handleSendAlert}
        setShowAlertModal={setShowAlertModal}
      />
      <DoctorsPrescribeModal
        showModal={showModal}
        resetForm={resetForm}
        vitals={vitals}
        setVitals={setVitals}
        setMedicines={setMedicines}
        medicines={medicines}
        completeAppointment={completeAppointment}
        getAppointments={getAppointments}
        setProgress={setProgress}
        selectedApptId={selectedApptId}
      />
      <MissedAppointmentModal
        appointment={noShowFor}
        role="doctor"
        currency={currency}
        onClose={() => setNoShowFor(null)}
        onDone={getAppointments}
      />
    </div>
  );
};

export default DoctorAppointment;
