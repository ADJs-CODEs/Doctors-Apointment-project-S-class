"use client";

import { RiArrowRightLine, RiCalendarCheckLine, RiCloseCircleLine, RiErrorWarningFill, RiGroupLine, RiStethoscopeLine } from "@remixicon/react";
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "@/lib/navigation";
import { Avatar, isCritical } from "../../components/visits";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import { MissedBadge } from "../../Modal/MissedAppointmentModal";
import type { AdminContextType, AppContextType, Appointment } from "../../types/index";

/** The clinic at a glance: doctors, bookings, patients and the latest bookings. Same layout as the doctor's dashboard. */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { aToken, cancelAppointment, dashData, getDashData } = useContext(AdminContext) as AdminContextType;
  const { slotDateFormat, currency } = useContext(AppContext) as AppContextType;
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (aToken) getDashData();
  }, [aToken, getDashData]);

  if (!dashData) {
    return (
      <div className="p-6 md:p-10 animate-pulse space-y-6 max-w-5xl mx-auto">
        <div className="h-8 w-56 bg-slate-200 rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-[32px]" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-[40px]" />
      </div>
    );
  }

  const cancel = async (id: string) => {
    setCancelling(id);
    try {
      await cancelAppointment(id);
    } finally {
      setCancelling(null);
    }
  };

  const statCards = [
    { icon: <RiStethoscopeLine size={24} />, value: dashData.doctors, label: "Doctors", color: "bg-teal-50 text-teal-600", hover: "group-hover:bg-teal-500 group-hover:text-white", path: "/doctor-list" },
    { icon: <RiCalendarCheckLine size={24} />, value: dashData.appointments, label: "Bookings", color: "bg-blue-50 text-blue-600", hover: "group-hover:bg-blue-500 group-hover:text-white", path: "/all-appointments" },
    { icon: <RiGroupLine size={24} />, value: dashData.patients, label: "Patients", color: "bg-purple-50 text-purple-600", hover: "", path: null },
  ];

  const latest: Appointment[] = dashData.latestAppointments ?? [];

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Admin <span className="text-teal-500 font-serif italic normal-case">Dashboard</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium mt-1">Your doctors, bookings and the latest appointments across the clinic.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <div
              key={s.label}
              onClick={() => s.path && navigate(s.path)}
              className={`bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex items-center gap-5 group transition-all duration-300 ${
                s.path ? "cursor-pointer hover:bg-slate-900 hover:border-slate-900 hover:shadow-xl" : ""
              }`}
            >
              <div className={`p-3.5 rounded-2xl transition-all duration-300 ${s.color} ${s.path ? s.hover : ""}`}>{s.icon}</div>
              <div>
                <p className={`text-xl sm:text-2xl font-black text-slate-900 leading-none transition-colors ${s.path ? "group-hover:text-white" : ""}`}>{s.value}</p>
                <p className="text-[9px] font-black uppercase tracking-[2px] text-slate-400 mt-1.5">{s.label}</p>
              </div>
              {s.path && <RiArrowRightLine size={16} className="ml-auto text-slate-200 group-hover:text-teal-400 transition-colors" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-900">Latest Bookings</p>
            </div>
            <button
              onClick={() => navigate("/all-appointments")}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 group"
            >
              View all <RiArrowRightLine size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {latest.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium text-sm">No bookings yet.</div>
            ) : (
              latest.map((item) => {
                const urgent = isCritical(item);
                return (
                  <div key={item._id} className={`flex flex-wrap sm:flex-nowrap items-center gap-4 px-6 sm:px-8 py-4 sm:py-5 hover:bg-slate-50/80 transition-all ${urgent ? "bg-red-50/30" : ""}`}>
                    <div className="relative shrink-0">
                      <Avatar src={item.userData?.image} name={item.userData?.name ?? "Patient"} />
                      {urgent && (
                        <div className="absolute -top-1 -right-1 text-red-500 bg-white rounded-full">
                          <RiErrorWarningFill size={14} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black truncate ${urgent ? "text-red-700" : "text-slate-900"}`}>{item.userData?.name}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                        with {item.docData?.name} · {slotDateFormat(item.slotDate)} · {item.slotTime}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {item.missed ? (
                        <MissedBadge item={item} currency={currency} />
                      ) : item.cancelled ? (
                        <span className="text-[9px] font-black uppercase bg-red-50 text-red-400 border border-red-100 px-3 py-1.5 rounded-full">Cancelled</span>
                      ) : item.isCompleted ? (
                        <span className="text-[9px] font-black uppercase bg-teal-50 text-teal-600 border border-teal-100 px-3 py-1.5 rounded-full">Completed</span>
                      ) : (
                        <>
                          {!item.payment && (
                            <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-full">Not paid</span>
                          )}
                          <button
                            onClick={() => cancel(item._id)}
                            disabled={cancelling === item._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 disabled:opacity-50"
                          >
                            <RiCloseCircleLine size={15} /> {cancelling === item._id ? "Cancelling…" : "Cancel"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-50">
            <button
              onClick={() => navigate("/all-appointments")}
              className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 hover:text-slate-900 transition-colors"
            >
              View all appointments →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
