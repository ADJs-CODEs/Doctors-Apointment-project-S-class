import React, { useContext, useEffect, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext.js";
import { AppContext } from "../../context/AppContext.js";
import type {
  DoctorContextType,
  AppContextType,
  Appointment,
  Medicine,
} from "../../types/index.js";
import {
  RiMoneyDollarCircleLine,
  RiCalendarCheckLine,
  RiGroupLine,
  RiCloseCircleFill,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiArrowRightLine,
} from "@remixicon/react";
import { useNavigate } from "react-router-dom";
import DoctorsDashboardModal from "../../Modal/DoctorsDashboardModal.js";

const DoctorDashboard: React.FC = () => {
  const {
    dToken,
    dashData,
    getDashData,
    completeAppointment,
    cancelAppointment,
  } = useContext(DoctorContext) as DoctorContextType;
  const { currency, slotDateFormat, setProgress } = useContext(
    AppContext,
  ) as AppContextType;
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState("");
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    notes: "",
  });
  const [medicines, setMedicines] = useState<Medicine[]>([
    {
      name: "",
      frequencyType: "daily",
      frequencyValue: 1,
      totalQuantity: 7,
      status: "Active",
      remainingQuantity: 7,
      lastTaken: "",
    },
  ]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!dToken) return;
      setProgress(20);
      setTimeout(() => mounted && setProgress(50), 150);
      await getDashData();
      if (mounted) {
        setProgress(100);
        setTimeout(() => mounted && setProgress(0), 600);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [dToken, getDashData, setProgress]);

  const resetForm = () => {
    setVitals({ bloodPressure: "", heartRate: "", temperature: "", notes: "" });
    setMedicines([
      {
        name: "",
        frequencyType: "daily",
        frequencyValue: 1,
        totalQuantity: 7,
        status: "Active",
        remainingQuantity: 7,
        lastTaken: "",
      },
    ]);
    setShowModal(false);
    setSelectedApptId("");
  };

  if (!dashData)
    return (
      <div className="p-6 md:p-10 animate-pulse space-y-6">
        <div className="h-8 w-56 bg-slate-200 rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-[32px]" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-[40px]" />
      </div>
    );

  const latestBookings =
    dashData.latestAppointments || dashData.latestAppointment || [];

  const statCards = [
    {
      icon: <RiMoneyDollarCircleLine size={24} />,
      value: `${currency}${dashData.earnings}`,
      label: "Total Earnings",
      color: "bg-teal-50 text-teal-600",
      hover: "group-hover:bg-teal-500 group-hover:text-white",
      path: null,
    },
    {
      icon: <RiCalendarCheckLine size={24} />,
      value: dashData.appointments,
      label: "Total Bookings",
      color: "bg-blue-50 text-blue-600",
      hover: "group-hover:bg-blue-500 group-hover:text-white",
      path: "/doctor-appointments",
    },
    {
      icon: <RiGroupLine size={24} />,
      value: dashData.patients,
      label: "Unique Patients",
      color: "bg-purple-50 text-purple-600",
      hover: "group-hover:bg-purple-500 group-hover:text-white",
      path: null,
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Doctor{" "}
            <span className="text-teal-500 font-serif italic normal-case">
              Overview
            </span>
          </h1>
          <p className="text-slate-400 text-xs font-medium mt-1">
            Your clinical dashboard and appointment feed.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s, i) => (
            <div
              key={i}
              onClick={() => s.path && navigate(s.path)}
              className={`bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex items-center gap-5 group transition-all duration-300 ${s.path ? "cursor-pointer hover:bg-slate-900 hover:border-slate-900 hover:shadow-xl" : ""}`}
            >
              <div
                className={`p-3.5 rounded-2xl transition-all duration-300 ${s.color} ${s.path ? s.hover : ""}`}
              >
                {s.icon}
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-white transition-colors leading-none">
                  {s.value}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[2px] text-slate-400 mt-1.5 group-hover:text-slate-400 transition-colors">
                  {s.label}
                </p>
              </div>
              {s.path && (
                <RiArrowRightLine
                  size={16}
                  className="ml-auto text-slate-200 group-hover:text-teal-400 transition-colors"
                />
              )}
            </div>
          ))}
        </div>

        {/* Latest bookings */}
        <div className="bg-white rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-900">
                Latest Bookings
              </p>
            </div>
            <button
              onClick={() => navigate("/doctor-appointments")}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 group"
            >
              View all{" "}
              <RiArrowRightLine
                size={12}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {latestBookings.length > 0 ? (
              latestBookings.map((item: Appointment, index: number) => {
                const isUrgent =
                  item.patientStatus === "Critical" ||
                  item.healthData?.prescribedMedicines?.some(
                    (m: any) => m.overdoseAlert,
                  );

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-4 px-6 sm:px-8 py-4 sm:py-5 hover:bg-slate-50/80 transition-all ${isUrgent ? "bg-red-50/30" : ""}`}
                  >
                    <div className="relative shrink-0">
                      <img
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover border-2 border-white shadow-sm bg-slate-100"
                        src={item.userData.image}
                        alt=""
                      />
                      {isUrgent && (
                        <div className="absolute -top-1 -right-1 text-red-500 bg-white rounded-full">
                          <RiErrorWarningFill size={14} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-black truncate ${isUrgent ? "text-red-700" : "text-slate-900"}`}
                      >
                        {item.userData.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {slotDateFormat(item.slotDate)} · {item.slotTime}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.cancelled ? (
                        <span className="text-[9px] font-black uppercase bg-red-50 text-red-400 border border-red-100 px-3 py-1.5 rounded-full">
                          Cancelled
                        </span>
                      ) : item.isCompleted ? (
                        <span className="text-[9px] font-black uppercase bg-teal-50 text-teal-600 border border-teal-100 px-3 py-1.5 rounded-full">
                          Completed
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setProgress(40);
                              await cancelAppointment(item._id);
                              setProgress(100);
                            }}
                            className="p-2 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl active:scale-90 transition-all group"
                          >
                            <RiCloseCircleFill className="text-red-400 group-hover:text-red-600 size-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApptId(item._id);
                              setShowModal(true);
                            }}
                            className="p-2 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-xl active:scale-90 transition-all group"
                          >
                            <RiCheckboxCircleFill className="text-teal-500 group-hover:text-teal-700 size-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center text-slate-400 font-medium text-sm">
                No recent bookings.
              </div>
            )}
          </div>

          <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-50">
            <button
              onClick={() => navigate("/doctor-appointments")}
              className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 hover:text-slate-900 transition-colors"
            >
              View full schedule →
            </button>
          </div>
        </div>
      </div>

      <DoctorsDashboardModal
        showModal={showModal}
        resetForm={resetForm}
        vitals={vitals}
        setVitals={setVitals}
        setMedicines={setMedicines}
        medicines={medicines}
        completeAppointment={completeAppointment}
        getDashData={getDashData}
        setProgress={setProgress}
        selectedApptId={selectedApptId}
      />
    </div>
  );
};

export default DoctorDashboard;
