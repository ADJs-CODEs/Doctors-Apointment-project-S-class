"use client";

import { RiAlarmWarningLine, RiArrowRightSLine, RiErrorWarningLine, RiCapsuleLine } from "@remixicon/react";
import { motion } from "framer-motion";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import MedicineRow from "@/components/patient/MedicineRow";
import MessageDoctorButton from "@/components/patient/MessageDoctorButton";
import VitalsCard from "@/cards/VitalsCard";
import { AppContext } from "@/Context/AppContext";
import { doseKey, useDoseLogger } from "@/hooks/useDoseLogger";
import { useLocation, useNavigate } from "@/lib/navigation";
import type { AppContextType, Appointment, MedicationsFocus } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { doseUrgency } from "@/utils/medicationUtils";
import { completedVisits, formatVisitDate, latestRecordedVisit, medicineState } from "@/utils/patientRecords";


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
      <div className="max-w-5xl mx-auto py-4 space-y-5">
        {[24, 48, 48].map((h, i) => (
          <div key={i} className="animate-pulse rounded-[24px] bg-line/70" style={{ height: h * 4 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-5">
      {earlyDoseDialog}
      <div>
        <p className="eyebrow mb-1.5">Your medicines</p>
        <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink">Medications</h1>
        <p className="text-[16px] text-ink-2 mt-2">Everything your doctors prescribed, grouped by visit. Log each dose here.</p>
      </div>

      {/* what needs attention, at a glance */}
      {(missedCount > 0 || dueCount > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {missedCount > 0 && (
            <div className="flex items-center gap-3 rounded-[16px] bg-rose-50 border border-rose-200 px-4 py-3.5">
              <RiErrorWarningLine size={22} className="text-rose-600 shrink-0" />
              <p className="text-[15px] text-rose-800">
                <span className="font-bold">
                  {missedCount} medicine{missedCount > 1 ? "s" : ""} missed.
                </span>{" "}
                Take the next dose as soon as you can, or ask your doctor.
              </p>
            </div>
          )}
          {dueCount > 0 && (
            <div className="flex items-center gap-3 rounded-[16px] bg-orange-50 border border-orange-200 px-4 py-3.5">
              <RiAlarmWarningLine size={22} className="text-orange-600 shrink-0" />
              <p className="text-[15px] text-orange-800">
                <span className="font-bold">
                  {dueCount} dose{dueCount > 1 ? "s" : ""} due now.
                </span>{" "}
                Take {dueCount > 1 ? "them" : "it"} and tap “I took it” so it isn&apos;t marked missed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* latest vitals */}
      <VitalsCard latestAppointment={latest} />

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
              className={`surface rounded-[24px] overflow-hidden ${
                isFocused
                  ? "!border-brand ring-4 ring-brand/15"
                  : visitUrgency === "missed"
                    ? "!border-rose-200"
                    : visitUrgency === "due"
                      ? "!border-orange-200"
                      : ""
              }`}
            >
              <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-line">
              <button
                onClick={() => navigate("/my-appointments", { state: { highlightId: visit._id } })}
                className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={visit.docData?.image}
                    alt=""
                    className="w-11 h-11 rounded-[14px] object-cover bg-brand-soft border border-line shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-ink truncate">{visit.docData?.name}</p>
                    <p className="text-[13px] text-ink-3 truncate">
                      {visit.docData?.speciality} · {formatVisitDate(visit)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {visitUrgency && (
                    <span
                      className={`flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full ${
                        visitUrgency === "missed" ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          visitUrgency === "missed" ? "bg-rose-600" : "bg-orange-500"
                        }`}
                      />
                      {visitUrgency === "missed" ? "Missed" : "Due"}
                    </span>
                  )}
                  <span
                    className={`hidden sm:inline text-[12px] font-bold px-2.5 py-1 rounded-full ${
                      summary.running ? "bg-brand-soft text-brand-ink" : "bg-canvas border border-line text-ink-3"
                    }`}
                  >
                    {summary.text}
                  </span>
                  <span className="hidden sm:flex items-center text-[13px] font-bold text-brand-ink group-hover:underline">
                    View visit <RiArrowRightSLine size={16} />
                  </span>
                </div>
              </button>
              <MessageDoctorButton doctorId={visit.docId} appointmentId={visit._id} label="Message" compact />
              </div>

              <div className="px-5 sm:px-6 py-5 divide-y divide-line">
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
        <section className="glass rounded-[24px] px-6 py-14 text-center">
          <span className="w-14 h-14 mx-auto mb-5 rounded-[16px] grid place-items-center bg-brand-soft text-brand-ink border border-[#C4E8E5]">
            <RiCapsuleLine size={26} />
          </span>
          <p className="text-[20px] font-extrabold text-ink">No prescriptions yet</p>
          <p className="text-[15px] text-ink-2 mt-2">
            Medicines your doctor prescribes after a visit will show up here.
          </p>
        </section>
      )}
    </div>
  );
};

export default MedHistory;
