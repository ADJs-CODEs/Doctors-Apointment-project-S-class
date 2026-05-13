import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../Context/AppContext.js";
import type { AppContextType, Appointment } from "../types/index.js";
import { motion } from "framer-motion";
import {
  RiMedicineBottleLine,
  RiHeartPulseLine,
  RiDashboardLine,
  RiTempHotLine,
  RiCheckboxCircleFill,
  RiTimeLine,
  RiArrowRightLine,
} from "@remixicon/react";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";
import { useNavigate } from "react-router-dom";

const MedHistory: React.FC = () => {
  const { token, setProgress } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [latestVitals, setLatestVitals] = useState<any>(null);

  const fetchData = async () => {
    try {
      setProgress(30);
      const { data } = await axiosInstance.get(
        API_PATHS.USER.FETCH_APPOINTMENT,
      );
      setProgress(70);
      if (data.success) {
        setAppointments(data.appointments.reverse());
        const latest = data.appointments.find(
          (app: Appointment) => app.isCompleted && app.healthData,
        );
        if (latest) setLatestVitals(latest.healthData);
      }
      setProgress(100);
    } catch (error: any) {
      console.error(error.message);
      setProgress(100);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
            <RiMedicineBottleLine size={20} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
            Pharmacy{" "}
            <span className="text-teal-500 font-serif normal-case italic">
              Vault
            </span>
          </h1>
        </div>
        <p className="text-slate-400 text-xs font-medium ml-12">
          Your complete prescription and medication history.
        </p>
      </div>

      {/* Quick vitals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          {
            icon: <RiHeartPulseLine size={20} />,
            label: "Latest Pulse",
            value: latestVitals?.heartRate,
            unit: "BPM",
            border: "border-b-4 border-rose-400",
            iconColor: "text-rose-500",
            bg: "bg-rose-50",
          },
          {
            icon: <RiDashboardLine size={20} />,
            label: "Latest BP",
            value: latestVitals?.bloodPressure,
            unit: "",
            border: "border-b-4 border-blue-400",
            iconColor: "text-blue-500",
            bg: "bg-blue-50",
          },
          {
            icon: <RiTempHotLine size={20} />,
            label: "Latest Temp",
            value: latestVitals?.temperature,
            unit: "°C",
            border: "border-b-4 border-orange-400",
            iconColor: "text-orange-500",
            bg: "bg-orange-50",
          },
        ].map((v, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-white ${v.border} rounded-[28px] p-6 shadow-sm border border-slate-100 flex items-center gap-4`}
          >
            <div className={`p-3 ${v.bg} rounded-2xl ${v.iconColor}`}>
              {v.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {v.label}
              </p>
              <p className="text-2xl font-black text-slate-900">
                {v.value || "--"}
                {v.value && v.unit && (
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    {v.unit}
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Prescription history */}
      <div className="space-y-5">
        {appointments.map((app, idx) =>
          app.healthData?.prescribedMedicines?.length ? (
            <motion.div
              key={app._id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06 }}
              className="bg-white border border-slate-100 border-l-4 border-l-teal-500 rounded-[28px] md:rounded-[36px] p-6 md:p-8 shadow-sm"
            >
              {/* Card header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-50">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Prescribed On
                  </p>
                  <p className="font-black text-slate-800 text-sm">
                    {app.slotDate.replace(/_/g, " / ")}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {app.docData?.name} · {app.docData?.speciality}
                  </p>
                </div>
                <span
                  className={`self-start sm:self-auto text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                    app.isCompleted
                      ? "bg-teal-50 text-teal-600 border-teal-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                  }`}
                >
                  {app.isCompleted ? "Completed Course" : "In Progress"}
                </span>
              </div>

              {/* Medicines grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {app.healthData!.prescribedMedicines.map((med, i) => {
                  const remaining = med.remainingQuantity ?? 0;
                  const total = med.totalQuantity ?? 1;
                  const progress = Math.round(
                    ((total - remaining) / total) * 100,
                  );

                  return (
                    <div
                      key={i}
                      onClick={() => navigate("/my-appointments")}
                      className="bg-slate-50 border border-slate-100 rounded-[20px] p-5 cursor-pointer hover:bg-white hover:border-teal-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-white border border-slate-100 rounded-xl text-teal-500 group-hover:bg-teal-50 transition-colors">
                          <RiMedicineBottleLine size={16} />
                        </div>
                        <p className="font-black text-slate-900 text-sm truncate">
                          {med.name}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {med.dosagePerDay} doses/day
                        </p>
                        <p className="text-xs font-black text-teal-600">
                          {remaining} left
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                        {progress}% taken
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* View details link */}
              <button
                onClick={() => navigate("/my-appointments")}
                className="flex items-center gap-2 mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 transition-colors group"
              >
                View full appointment
                <RiArrowRightLine
                  size={13}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </motion.div>
          ) : null,
        )}

        {/* Empty state */}
        {appointments.filter((a) => a.healthData?.prescribedMedicines?.length)
          .length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-[32px] text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <RiMedicineBottleLine size={28} />
            </div>
            <h3 className="font-black text-slate-900 text-lg mb-1">
              No prescriptions yet
            </h3>
            <p className="text-slate-400 text-sm font-medium">
              Complete an appointment to see your medication history here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedHistory;
