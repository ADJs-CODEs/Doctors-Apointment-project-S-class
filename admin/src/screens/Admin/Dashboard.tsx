"use client";

import { RiCalendarCheckLine, RiCloseCircleLine, RiErrorWarningFill, RiGroupLine, RiStethoscopeLine } from "@remixicon/react";
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "@/lib/navigation";
import { Avatar, isCritical } from "../../components/visits";
import { PageHeader, Panel, Pill, Skeleton, StatCard } from "../../components/panel";
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
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

  const latest: Appointment[] = dashData.latestAppointments ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto space-y-5">
        <PageHeader eyebrow="The clinic" title="Dashboard" subtitle="Your doctors, bookings and the latest appointments across the clinic." />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<RiStethoscopeLine size={22} />} value={dashData.doctors} label="Doctors" onClick={() => navigate("/doctor-list")} />
          <StatCard icon={<RiCalendarCheckLine size={22} />} value={dashData.appointments} label="Bookings" tone="blue" onClick={() => navigate("/all-appointments")} />
          <StatCard icon={<RiGroupLine size={22} />} value={dashData.patients} label="Patients" tone="violet" />
        </div>

        <Panel
          title="Latest bookings"
          icon={<RiCalendarCheckLine size={17} />}
          action="View all"
          onAction={() => navigate("/all-appointments")}
        >
          <div className="divide-y divide-line">
            {latest.length === 0 ? (
              <div className="py-14 text-center text-ink-3 text-[15px]">No bookings yet.</div>
            ) : (
              latest.map((item) => {
                const urgent = isCritical(item);
                return (
                  <div key={item._id} className={`flex flex-wrap sm:flex-nowrap items-center gap-4 px-5 sm:px-6 py-4 hover:bg-canvas/70 transition-colors ${urgent ? "bg-rose-50/40" : ""}`}>
                    <div className="relative shrink-0">
                      <Avatar src={item.userData?.image} name={item.userData?.name ?? "Patient"} />
                      {urgent && (
                        <div className="absolute -top-1 -right-1 text-red-500 bg-white rounded-full">
                          <RiErrorWarningFill size={14} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-bold truncate ${urgent ? "text-rose-700" : "text-ink"}`}>{item.userData?.name}</p>
                      <p className="text-[13px] text-ink-3 mt-0.5 truncate">
                        with {item.docData?.name} · {slotDateFormat(item.slotDate)} · <span className="num">{item.slotTime}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {item.missed ? (
                        <MissedBadge item={item} currency={currency} />
                      ) : item.cancelled ? (
                        <Pill tone="rose">Cancelled</Pill>
                      ) : item.isCompleted ? (
                        <Pill tone="brand">Completed</Pill>
                      ) : (
                        <>
                          {!item.payment && <Pill tone="amber">Not paid</Pill>}
                          <button
                            type="button"
                            onClick={() => cancel(item._id)}
                            disabled={cancelling === item._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-white text-[13px] font-bold text-ink-2 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 disabled:opacity-50"
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
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
