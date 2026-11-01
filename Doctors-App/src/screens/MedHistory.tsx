"use client";

import {
  RiAlarmWarningLine,
  RiArrowRightSLine,
  RiErrorWarningLine,
  RiCapsuleLine,
  RiDashboard3Line,
  RiHeartPulseLine,
  RiTempHotLine,
} from "@remixicon/react";
import { motion } from "framer-motion";
import { type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import MedicineRow from "@/components/patient/MedicineRow";
import MessageDoctorButton from "@/components/patient/MessageDoctorButton";
import { AppContext } from "@/Context/AppContext";
import { doseKey, useDoseLogger } from "@/hooks/useDoseLogger";
import { useLocation, useNavigate } from "@/lib/navigation";
import type { AppContextType, Appointment, MedicationsFocus } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { doseUrgency } from "@/utils/medicationUtils";
import { completedVisits, formatVisitDate, latestRecordedVisit, medicineState } from "@/utils/patientRecords";

function Vital({ icon, label, value, unit }: { icon: ReactNode; label: string; value?: string; unit: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
      <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-xl font-black text-slate-900">
          {value || "--"} <span className="text-[11px] font-medium text-slate-400">{value ? unit : ""}</span>
        </p>
      </div>
    </div>
  );
}

/** Short summary for a visit's header, e.g. "2 to take · 1 finished". */
function visitSummary(states: { kind: string }[]) {
  const running = states.filter((s) => s.kind !== "finished" && s.kind !== "lapsed").length;
  const finished = states.filter((s) => s.kind === "finished").length;
  const parts = [];
  if (running) parts.push(`${running} to take`);
  if (finished) parts.push(`${finished} finished`);
  if (states.length - running - finished) parts.push(`${states.length - running - finished} stopped`);
  return { text: parts.join(" · "), running };
}

const MedHistory = () => {
  const { token } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAppointments = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.USER.FETCH_APPOINTMENT);
      if (data.success) setAppointments(data.appointments);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Couldn't load your medications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadAppointments();
  }, [token, loadAppointments]);

  const { logDose, loggingKey, dialog: earlyDoseDialog } = useDoseLogger(loadAppointments);

  // re-evaluated every minute so rows turn orange/red while the page is open
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // one card per visit that prescribed something, newest first
  const { latest, visits, dueCount, missedCount } = useMemo(() => {
    const visits = completedVisits(appointments)
      .filter((a) => a.healthData?.prescribedMedicines?.length)
      .map((visit) => ({
        visit,
        medicines: visit.healthData!.prescribedMedicines.map((med) => ({
          med,
          state: medicineState(visit, med, now),
        })),
      }));
    const urgencies = visits.flatMap((v) => v.medicines.map((m) => doseUrgency(m.state)));
    return {
      latest: latestRecordedVisit(appointments),
      visits,
      dueCount: urgencies.filter((u) => u === "due").length,
      missedCount: urgencies.filter((u) => u === "missed").length,
    };
  }, [appointments, now]);

  // Arriving from an appointment's report: scroll to that medicine (or the whole visit)
  // and highlight it.
  const focus = (location.state as MedicationsFocus | null) ?? null;
  const focusKey = focus?.medicine ? doseKey(focus.visitId, focus.medicine) : null;
  const refs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    if (loading || !focus) return;
    const target = (focusKey && refs.current[focusKey]) || refs.current[focus.visitId];
    const timer = setTimeout(() => target?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    return () => clearTimeout(timer);
  }, [loading, focus, focusKey]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-6 space-y-6">
        {[24, 48, 48].map((h, i) => (
          <div key={i} className="animate-pulse rounded-[28px] bg-slate-200/60" style={{ height: h * 4 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      {earlyDoseDialog}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Medications</h1>
        <p className="text-slate-500 mt-1">Everything your doctors prescribed, grouped by visit. Log each dose here.</p>
      </div>

      {/* what needs attention, at a glance */}
      {(missedCount > 0 || dueCount > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {missedCount > 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5">
              <RiErrorWarningLine size={22} className="text-red-600 shrink-0" />
              <p className="text-sm text-red-800">
                <span className="font-black">
                  {missedCount} medicine{missedCount > 1 ? "s" : ""} missed.
                </span>{" "}
                Take the next dose as soon as you can, or ask your doctor.
              </p>
            </div>
          )}
          {dueCount > 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3.5">
              <RiAlarmWarningLine size={22} className="text-orange-600 shrink-0" />
              <p className="text-sm text-orange-800">
                <span className="font-black">
                  {dueCount} dose{dueCount > 1 ? "s" : ""} due now.
                </span>{" "}
                Take {dueCount > 1 ? "them" : "it"} and tap “I took it” so it isn&apos;t marked missed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* latest vitals */}
      <section className="bg-white rounded-[28px] border border-slate-100 shadow-clinical p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[2px] text-slate-400 mb-5">
          <RiHeartPulseLine size={16} className="text-teal-600" />
          Latest vitals
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Vital
            icon={<RiHeartPulseLine size={20} className="text-rose-500" />}
            label="Heart rate"
            value={latest?.healthData?.heartRate}
            unit="BPM"
          />
          <Vital
            icon={<RiDashboard3Line size={20} className="text-blue-500" />}
            label="Blood pressure"
            value={latest?.healthData?.bloodPressure}
            unit="mmHg"
          />
          <Vital
            icon={<RiTempHotLine size={20} className="text-orange-500" />}
            label="Temperature"
            value={latest?.healthData?.temperature}
            unit="°C"
          />
        </div>
        <p className="text-[12px] text-slate-400 mt-3">
          {latest
            ? `Recorded by ${latest.docData?.name} on ${formatVisitDate(latest)}.`
            : "Your doctor records these during a visit."}
        </p>
      </section>

      {/* prescriptions, one card per visit */}
      {visits.length ? (
        visits.map(({ visit, medicines }, i) => {
          const summary = visitSummary(medicines.map((m) => m.state));
          const isFocused = visit._id === focus?.visitId;
          const urgencies = medicines.map((m) => doseUrgency(m.state));
          const visitUrgency = urgencies.includes("missed") ? "missed" : urgencies.includes("due") ? "due" : null;
          return (
            <motion.section
              key={visit._id}
              ref={(el) => {
                refs.current[visit._id] = el;
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 5) * 0.04 }}
              className={`bg-white rounded-[28px] border shadow-clinical overflow-hidden ${
                isFocused
                  ? "border-teal-300 ring-4 ring-teal-100"
                  : visitUrgency === "missed"
                    ? "border-red-200"
                    : visitUrgency === "due"
                      ? "border-orange-200"
                      : "border-slate-100"
              }`}
            >
              <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
              <button
                onClick={() => navigate("/my-appointments", { state: { highlightId: visit._id } })}
                className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={visit.docData?.image}
                    alt=""
                    className="w-11 h-11 rounded-2xl object-cover bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 truncate">{visit.docData?.name}</p>
                    <p className="text-[12px] text-slate-400 truncate">
                      {visit.docData?.speciality} · {formatVisitDate(visit)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {visitUrgency && (
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        visitUrgency === "missed" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          visitUrgency === "missed" ? "bg-red-600" : "bg-orange-500"
                        }`}
                      />
                      {visitUrgency === "missed" ? "Missed" : "Due"}
                    </span>
                  )}
                  <span
                    className={`hidden sm:inline text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      summary.running ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {summary.text}
                  </span>
                  <span className="hidden sm:flex items-center text-[11px] font-bold text-teal-600 group-hover:text-teal-700">
                    View visit <RiArrowRightSLine size={16} />
                  </span>
                </div>
              </button>
              <MessageDoctorButton doctorId={visit.docId} appointmentId={visit._id} label="Message" compact />
              </div>

              <div className="px-5 sm:px-6 py-5 divide-y divide-slate-100">
                {medicines.map(({ med, state }) => {
                  const key = doseKey(visit._id, med.name);
                  return (
                    <MedicineRow
                      key={key}
                      ref={(el) => {
                        refs.current[key] = el;
                      }}
                      med={med}
                      state={state}
                      highlighted={key === focusKey}
                      busy={loggingKey === key}
                      disabled={!!loggingKey}
                      onTake={() => logDose(visit._id, med)}
                    />
                  );
                })}
              </div>
            </motion.section>
          );
        })
      ) : (
        <section className="bg-white rounded-[28px] border border-slate-100 shadow-clinical px-6 py-14 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-teal-50 flex items-center justify-center">
            <RiCapsuleLine size={26} className="text-teal-600" />
          </div>
          <p className="font-black text-slate-900">No prescriptions yet</p>
          <p className="text-sm text-slate-500 mt-2">
            Medicines your doctor prescribes after a visit will show up here.
          </p>
        </section>
      )}
    </div>
  );
};

export default MedHistory;
