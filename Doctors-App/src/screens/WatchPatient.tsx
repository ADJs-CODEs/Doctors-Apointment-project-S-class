"use client";

import React, { useEffect, useMemo, useState, useContext } from "react";
import { useParams, useNavigate } from "@/lib/navigation";
import NudgePanel from "@/components/NudgePanel";
import IconTile from "@/components/brand/IconTile";
import { AppContext } from "../Context/AppContext";
import type { AppContextType, Appointment } from "../types/index";
import { motion } from "framer-motion";
import { toast } from "sonner";
import VitalsCard from "../cards/VitalsCard";
import {
  RiArrowLeftLine,
  RiEyeLine,
  RiCapsuleLine,
  RiCalendarCheckLine,
  RiErrorWarningLine,
  RiHospitalLine,
  RiVideoOnLine,
} from "@remixicon/react";
import { describeSchedule, doseUrgency } from "../utils/medicationUtils";
import { activeMedicines, isUpcomingVisit, latestRecordedVisit, visitStart } from "../utils/patientRecords";
import { doseStatusLabel } from "../components/patient/MedicineRow";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

/** Read-only view of someone you watch over: their next visits, medicines and latest vitals. */
const WatchPatient: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { token, slotDateFormat } = useContext(AppContext) as AppContextType;

  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.CONNECTIONS.PATIENT_DATA(patientId!));
      if (data.success) {
        setPatient(data.patient);
        setAppointments(data.appointments);
      } else {
        toast.error(data.message);
        navigate("/watching-over");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "You can't see this person's care");
      navigate("/watching-over");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && patientId) fetchData();
  }, [token, patientId]);

  const { upcoming, medicines, latest, earlyDoses } = useMemo(() => {
    const medicines = activeMedicines(appointments);
    return {
      upcoming: appointments.filter((a) => isUpcomingVisit(a)).sort((a, b) => visitStart(a) - visitStart(b)),
      medicines,
      latest: latestRecordedVisit(appointments),
      earlyDoses: medicines.filter((m) => m.med.overdoseAlert).length,
    };
  }, [appointments]);

  const first = patient?.name?.split(" ")[0] ?? "them";

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-4 space-y-4 px-4 md:px-0">
        {[28, 40, 56].map((h, i) => (
          <div key={i} className="rounded-[24px] bg-line/70 animate-pulse" style={{ height: h * 4 }} />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-4 md:py-8 px-4 md:px-0 space-y-6">
      <button
        type="button"
        onClick={() => navigate("/watching-over")}
        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-3 hover:text-brand-ink"
      >
        <RiArrowLeftLine size={16} /> Care circle
      </button>

      {/* who */}
      <div className="glass rounded-[24px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <img
          src={patient?.image}
          alt=""
          className="w-16 h-16 rounded-[18px] object-cover bg-brand-soft border border-line shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.03em] text-ink truncate">{patient?.name}</h1>
          <p className="text-[14px] text-ink-3 truncate">{patient?.email}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto text-[13px] font-semibold text-ink-2 bg-white border border-line rounded-full px-3 py-1.5">
          <RiEyeLine size={15} className="text-brand-ink" /> View only
        </span>
      </div>

      {earlyDoses > 0 && (
        <div className="rounded-[18px] bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
          <RiErrorWarningLine size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[15px] text-rose-800">
            <b>
              {first} took {earlyDoses} dose{earlyDoses > 1 ? "s" : ""} early.
            </b>{" "}
            Their doctor has been told.
          </p>
        </div>
      )}

      {/* nudge them: lands on their phone even when the app is closed */}
      {patientId && patient && <NudgePanel toUserId={patientId} name={patient.name || "them"} as="caregiver" />}

      {/* next visits */}
      <section className="surface rounded-[24px] p-5 sm:p-6">
        <h2 className="flex items-center gap-2.5 text-[16px] font-bold text-ink mb-4">
          <IconTile>
            <RiCalendarCheckLine size={17} />
          </IconTile>
          Coming up
        </h2>
        {upcoming.length ? (
          <ul className="divide-y divide-line">
            {upcoming.map((item) => (
              <li key={item._id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                <img src={item.docData?.image} alt="" className="w-11 h-11 rounded-[14px] object-cover bg-brand-soft border border-line shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-ink truncate">{item.docData?.name}</p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-3">
                    {item.kind === "video" ? <RiVideoOnLine size={14} className="text-video" /> : <RiHospitalLine size={14} className="text-brand-ink" />}
                    {item.kind === "video" ? "Video call" : "Clinic visit"} · {slotDateFormat(item.slotDate)} ·{" "}
                    <span className="num">{item.slotTime}</span>
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full border text-[12px] font-bold ${
                    item.payment ? "bg-brand-soft text-brand-ink border-[#C4E8E5]" : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}
                >
                  {item.payment ? "Paid" : "Not paid yet"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-3">Nothing booked right now.</p>
        )}
      </section>

      {/* medicines */}
      <section className="surface rounded-[24px] p-5 sm:p-6">
        <h2 className="flex items-center gap-2.5 text-[16px] font-bold text-ink mb-1">
          <IconTile>
            <RiCapsuleLine size={17} />
          </IconTile>
          Medicines
        </h2>
        <p className="text-[13px] text-ink-3 mb-4">Only {first} can log their doses.</p>
        {medicines.length ? (
          <ul className="divide-y divide-line">
            {medicines.map((m) => {
              const status = doseStatusLabel(m.state);
              const urgency = doseUrgency(m.state);
              return (
                <li key={`${m.appointmentId}-${m.med.name}`} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`w-11 h-11 rounded-[14px] grid place-items-center shrink-0 ${
                      urgency === "missed" ? "bg-rose-100 text-rose-600" : urgency === "due" ? "bg-orange-100 text-orange-600" : "bg-brand-soft text-brand-ink"
                    }`}
                  >
                    <RiCapsuleLine size={20} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[15px] font-bold text-ink capitalize truncate">{m.med.name}</p>
                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${status.tone}`}>{status.text}</span>
                    </div>
                    <p className="text-[13px] text-ink-3 truncate">
                      {describeSchedule(m.med)} · {m.med.remainingQuantity} left · from {m.doctorName}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-3">No medicines to take right now.</p>
        )}
      </section>

      {/* vitals */}
      {latest?.healthData && <VitalsCard latestAppointment={latest} />}
    </motion.div>
  );
};

export default WatchPatient;
