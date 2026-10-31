"use client";

import {
  RiArrowRightSLine,
  RiCapsuleLine,
  RiDashboard3Line,
  RiFileList3Line,
  RiHeartPulseLine,
  RiTempHotLine,
} from "@remixicon/react";
import { motion } from "framer-motion";
import { type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import MedicineRow from "@/components/patient/MedicineRow";
import { AppContext } from "@/Context/AppContext";
import { doseKey, useDoseLogger } from "@/hooks/useDoseLogger";
import { useNavigate } from "@/lib/navigation";
import type { AppContextType, Appointment } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { describeSchedule, getAdherenceStats, getDoseState } from "@/utils/medicationUtils";
import { activeMedicines, completedVisits, formatVisitDate, latestRecordedVisit } from "@/utils/patientRecords";

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-[28px] border border-slate-100 shadow-clinical p-5 sm:p-6"
    >
      <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[2px] text-slate-400 mb-5">
        <span className="text-teal-600">{icon}</span>
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

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

const MedHistory = () => {
  const { token } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();
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

  const { logDose, loggingKey } = useDoseLogger(loadAppointments);

  const { active, latest, prescriptions } = useMemo(
    () => ({
      active: activeMedicines(appointments),
      latest: latestRecordedVisit(appointments),
      prescriptions: completedVisits(appointments).filter((a) => a.healthData?.prescribedMedicines?.length),
    }),
    [appointments],
  );

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-6 space-y-6">
        {[24, 40, 64].map((h) => (
          <div key={h} className="animate-pulse rounded-[28px] bg-slate-200/60" style={{ height: h * 4 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          Medications
        </h1>
        <p className="text-slate-500 mt-1">What to take, your latest readings, and every prescription so far.</p>
      </div>

      {/* latest vitals */}
      <Section title="Latest vitals" icon={<RiHeartPulseLine size={16} />}>
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
      </Section>

      {/* active medicines */}
      <Section title={`Taking now${active.length ? ` · ${active.length}` : ""}`} icon={<RiCapsuleLine size={16} />}>
        {active.length ? (
          <div className="divide-y divide-slate-100">
            {active.map((item) => {
              const key = doseKey(item.appointmentId, item.med.name);
              return (
                <MedicineRow
                  key={key}
                  med={item.med}
                  state={item.state}
                  doctorName={item.doctorName}
                  busy={loggingKey === key}
                  disabled={!!loggingKey}
                  onTake={() => logDose(item.appointmentId, item.med)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">You&apos;re not taking anything right now.</p>
        )}
      </Section>

      {/* every prescription, by visit */}
      <Section title="Prescription history" icon={<RiFileList3Line size={16} />}>
        {prescriptions.length ? (
          <div className="space-y-4">
            {prescriptions.map((visit) => (
              <div key={visit._id} className="rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => navigate("/my-appointments", { state: { highlightId: visit._id } })}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={visit.docData?.image}
                      alt=""
                      className="w-9 h-9 rounded-xl object-cover bg-white shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">{visit.docData?.name}</p>
                      <p className="text-[12px] text-slate-400 truncate">
                        {visit.docData?.speciality} · {formatVisitDate(visit)}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center text-[11px] font-bold text-teal-600 shrink-0">
                    View visit <RiArrowRightSLine size={16} />
                  </span>
                </button>

                <ul className="divide-y divide-slate-100">
                  {visit.healthData!.prescribedMedicines.map((med) => {
                    const { rate } = getAdherenceStats(med);
                    const finished = getDoseState(med).kind === "finished";
                    return (
                      <li key={med.name} className="flex items-center gap-4 px-4 sm:px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 capitalize truncate">{med.name}</p>
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                finished ? "bg-slate-100 text-slate-500" : "bg-teal-50 text-teal-700"
                              }`}
                            >
                              {finished ? "Finished" : "Active"}
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-400 mt-0.5">
                            {describeSchedule(med)} · {med.totalQuantity} prescribed · {med.remainingQuantity} left
                          </p>
                        </div>
                        <div className="w-24 sm:w-40 shrink-0">
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-teal-500" style={{ width: `${rate}%` }} />
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 mt-1 text-right">{rate}% taken</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Prescriptions from your visits will be listed here.</p>
        )}
      </Section>
    </div>
  );
};

export default MedHistory;
