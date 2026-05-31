import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../Context/AppContext.js";
import type { AppContextType, Appointment } from "../types/index.js";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiEyeLine,
  RiHeartPulseLine,
  RiDashboardLine,
  RiTempHotLine,
  RiMedicineBottleLine,
  RiCalendarCheckLine,
  RiLoader4Line,
  RiErrorWarningLine,
} from "@remixicon/react";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";

const WatchPatient: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { token, setProgress, slotDateFormat } = useContext(
    AppContext,
  ) as AppContextType;

  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setProgress(30);
      const { data } = await axiosInstance.get(
        API_PATHS.CONNECTIONS.PATIENT_DATA(patientId!),
      );
      setProgress(70);
      if (data.success) {
        setPatient(data.patient);
        setAppointments(data.appointments.reverse());
      } else {
        toast.error(data.message);
        navigate("/watching-over");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Access denied");
      navigate("/watching-over");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  useEffect(() => {
    if (token && patientId) fetchData();
  }, [token, patientId]);

  const upcomingAppointments = appointments.filter(
    (a) => !a.isCompleted && !a.cancelled,
  );
  const activeMeds = appointments
    .filter((a) => a.isCompleted && a.healthData?.prescribedMedicines?.length)
    .flatMap((a) =>
      a.healthData!.prescribedMedicines.filter(
        (m: any) => m.remainingQuantity > 0,
      ),
    );
  const latestVitals = appointments.find(
    (a) => a.healthData?.heartRate && a.healthData.heartRate !== "",
  )?.healthData;
  const criticalMeds = activeMeds.filter((m: any) => m.overdoseAlert);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RiLoader4Line size={32} className="text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-10 md:py-16"
    >
      {/* Back */}
      <button
        onClick={() => navigate("/watching-over")}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 transition-colors mb-8 group"
      >
        <RiArrowLeftLine
          size={14}
          className="group-hover:-translate-x-1 transition-transform"
        />
        Back to Connections
      </button>

      {/* Patient header */}
      <div className="bg-slate-900 rounded-[32px] p-8 mb-8">
        <div className="flex items-center gap-5 mb-4">
          <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center border border-teal-400/30 shrink-0">
            <RiEyeLine size={28} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-black">{patient?.name}</h1>
            <p className="text-slate-400 text-sm font-medium">
              {patient?.email}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest">
                Read Only View
              </p>
            </div>
          </div>
        </div>

        {/* Critical alert */}
        {criticalMeds.length > 0 && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-4 flex items-center gap-3">
            <RiErrorWarningLine size={20} className="text-red-400 shrink-0" />
            <div>
              <p className="text-red-400 font-black text-sm uppercase tracking-wider">
                Early Dose Alert
              </p>
              <p className="text-red-300 text-xs font-medium">
                {patient?.name?.split(" ")[0]} has logged {criticalMeds.length}{" "}
                early dose{criticalMeds.length > 1 ? "s" : ""} — doctor has been
                notified
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Read only notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-8 flex items-center gap-3">
        <RiEyeLine size={18} className="text-blue-500 shrink-0" />
        <p className="text-blue-600 text-xs font-bold leading-relaxed">
          You are viewing {patient?.name?.split(" ")[0]}'s health data in
          read-only mode. You cannot make changes on their behalf.
        </p>
      </div>

      {/* Vitals */}
      {latestVitals && (
        <div className="mb-8">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-4">
            Latest Vitals
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: <RiHeartPulseLine size={20} />,
                label: "Heart Rate",
                value: latestVitals.heartRate,
                unit: "BPM",
                border: "border-b-4 border-rose-400",
                iconColor: "text-rose-500",
                bg: "bg-rose-50",
              },
              {
                icon: <RiDashboardLine size={20} />,
                label: "Blood Pressure",
                value: latestVitals.bloodPressure,
                unit: "",
                border: "border-b-4 border-blue-400",
                iconColor: "text-blue-500",
                bg: "bg-blue-50",
              },
              {
                icon: <RiTempHotLine size={20} />,
                label: "Temperature",
                value: latestVitals.temperature,
                unit: "°C",
                border: "border-b-4 border-orange-400",
                iconColor: "text-orange-500",
                bg: "bg-orange-50",
              },
            ].map((v, i) => (
              <div
                key={i}
                className={`bg-white ${v.border} rounded-[24px] p-5 shadow-sm border border-slate-100 flex items-center gap-4`}
              >
                <div
                  className={`p-3 ${v.bg} rounded-2xl ${v.iconColor} shrink-0`}
                >
                  {v.icon}
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {v.label}
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    {v.value || "--"}
                    {v.value && v.unit && (
                      <span className="text-xs text-slate-400 font-normal ml-1">
                        {v.unit}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming appointments */}
      <div className="mb-8">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-4">
          Upcoming Appointments
        </h2>
        {upcomingAppointments.length > 0 ? (
          <div className="space-y-3">
            {upcomingAppointments.map((item) => (
              <div
                key={item._id}
                className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100 shrink-0">
                  <RiCalendarCheckLine size={20} className="text-teal-500" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-900 font-black text-base">
                    {item.docData?.name}
                  </p>
                  <p className="text-teal-500 text-xs font-bold uppercase tracking-wider">
                    {item.docData?.speciality}
                  </p>
                  <p className="text-slate-400 text-xs font-medium mt-1">
                    {slotDateFormat(item.slotDate)} · {item.slotTime}
                  </p>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase ${item.payment ? "bg-teal-50 text-teal-600 border-teal-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}
                >
                  {item.payment ? "Paid" : "Unpaid"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-[24px] p-8 text-center">
            <p className="text-slate-400 font-medium text-sm">
              No upcoming appointments
            </p>
          </div>
        )}
      </div>

      {/* Active medications */}
      <div className="mb-8">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-4">
          Active Medications
        </h2>
        {activeMeds.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {activeMeds.map((med: any, i: number) => {
              const pct = Math.round(
                ((med.totalQuantity - med.remainingQuantity) /
                  med.totalQuantity) *
                  100,
              );
              return (
                <div
                  key={i}
                  className={`bg-white border rounded-[24px] p-5 shadow-sm ${med.overdoseAlert ? "border-red-200" : "border-slate-100"}`}
                >
                  {med.overdoseAlert && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3 flex items-center gap-2">
                      <RiErrorWarningLine
                        size={14}
                        className="text-red-500 shrink-0"
                      />
                      <p className="text-red-600 text-xs font-bold">
                        Early dose logged
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`p-2 rounded-xl ${med.overdoseAlert ? "bg-red-50" : "bg-teal-50"}`}
                    >
                      <RiMedicineBottleLine
                        size={18}
                        className={
                          med.overdoseAlert ? "text-red-500" : "text-teal-500"
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 font-black text-sm">
                        {med.name}
                      </p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase">
                        {med.dosagePerDay} doses/day · {med.remainingQuantity}{" "}
                        left
                      </p>
                    </div>
                    <p className="text-teal-600 font-black text-sm">{pct}%</p>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? "bg-teal-500" : pct > 40 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 text-center">
                    Read only — only {patient?.name?.split(" ")[0]} can log
                    doses
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-[24px] p-8 text-center">
            <p className="text-slate-400 font-medium text-sm">
              No active medications
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default WatchPatient;
