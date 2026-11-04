"use client";

import React, { useContext, useEffect, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { AppContext } from "../../context/AppContext";
import type {
  DoctorContextType,
  AppContextType,
  Appointment,
  Medicine,
} from "../../types/index";
import {
  RiMoneyDollarCircleLine,
  RiCalendarCheckLine,
  RiGroupLine,
  RiCloseCircleLine,
  RiCheckboxCircleLine,
  RiErrorWarningFill,
} from "@remixicon/react";
import { useNavigate } from "@/lib/navigation";
import DoctorsDashboardModal from "../../Modal/DoctorsDashboardModal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Avatar } from "../../components/visits";
import { PageHeader, Panel, Pill, Skeleton, StatCard } from "../../components/panel";

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
  // cancelling refunds the patient, so it asks first
  const [cancelFor, setCancelFor] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);
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
    if (dToken) getDashData();
  }, [dToken, getDashData]);

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

  const latestBookings = [
    ...(dashData.latestAppointments || dashData.latestAppointment || []),
  ].sort((a: any, b: any) => {
    const aCritical =
      a.patientStatus === "Critical" ||
      a.healthData?.prescribedMedicines?.some((m: any) => m.overdoseAlert);
    const bCritical =
      b.patientStatus === "Critical" ||
      b.healthData?.prescribedMedicines?.some((m: any) => m.overdoseAlert);
    if (aCritical && !bCritical) return -1;
    if (!aCritical && bCritical) return 1;
    const aActive = !a.isCompleted && !a.cancelled;
    const bActive = !b.isCompleted && !b.cancelled;
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return b.date - a.date;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto space-y-5">
        <PageHeader eyebrow="Your practice" title="Dashboard" subtitle="Your earnings, bookings and latest appointments." />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<RiMoneyDollarCircleLine size={22} />} value={`${currency}${dashData.earnings}`} label="Earned from visits" onClick={() => navigate("/doctor-wallet")} />
          <StatCard icon={<RiCalendarCheckLine size={22} />} value={dashData.appointments} label="Bookings" tone="blue" onClick={() => navigate("/doctor-appointments")} />
          <StatCard icon={<RiGroupLine size={22} />} value={dashData.patients} label="Patients" tone="violet" />
        </div>

        <Panel title="Latest bookings" icon={<RiCalendarCheckLine size={17} />} action="Full schedule" onAction={() => navigate("/doctor-appointments")}>
          <div className="divide-y divide-line">
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
                    className={`flex flex-wrap sm:flex-nowrap items-center gap-4 px-5 sm:px-6 py-4 hover:bg-canvas/70 transition-colors ${isUrgent ? "bg-rose-50/40" : ""}`}
                  >
                    <div className="relative shrink-0">
                      <Avatar src={item.userData?.image} name={item.userData?.name ?? "Patient"} />
                      {isUrgent && (
                        <div className="absolute -top-1 -right-1 text-rose-500 bg-white rounded-full">
                          <RiErrorWarningFill size={14} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-bold truncate ${isUrgent ? "text-rose-700" : "text-ink"}`}>{item.userData.name}</p>
                      <p className="text-[13px] text-ink-3 mt-0.5">
                        {slotDateFormat(item.slotDate)} · <span className="num">{item.slotTime}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {item.cancelled ? (
                        <Pill tone="rose">Cancelled</Pill>
                      ) : item.isCompleted ? (
                        <Pill tone="brand">Completed</Pill>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelFor(item);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-white text-[13px] font-bold text-ink-2 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                          >
                            <RiCloseCircleLine size={15} /> Cancel
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApptId(item._id);
                              setShowModal(true);
                            }}
                            className="btn btn-teal !py-1.5 !px-3 !text-[13px] !rounded-xl"
                          >
                            <RiCheckboxCircleLine size={15} /> Complete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-14 text-center text-ink-3 text-[15px]">No recent bookings.</div>
            )}
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={!!cancelFor}
        title="Cancel this visit?"
        body={
          cancelFor
            ? `${cancelFor.userData?.name}'s visit on ${slotDateFormat(cancelFor.slotDate)} at ${cancelFor.slotTime} is cancelled and they get the full fee back.`
            : undefined
        }
        confirmLabel="Cancel visit"
        cancelLabel="Keep it"
        tone="rose"
        busy={cancelling}
        onCancel={() => setCancelFor(null)}
        onConfirm={async () => {
          if (!cancelFor) return;
          setCancelling(true);
          try {
            await cancelAppointment(cancelFor._id);
          } finally {
            setCancelling(false);
            setCancelFor(null);
          }
        }}
      />

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
