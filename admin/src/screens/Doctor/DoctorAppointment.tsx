"use client";

import React, { useMemo, useState } from "react";
import {
  RiUserUnfollowLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiErrorWarningFill,
  RiCalendarCheckLine,
  RiChat3Line,
  RiArrowDownSLine,
  RiShieldCheckLine,
  RiStethoscopeLine,
} from "@remixicon/react";
import { toast } from "sonner";
import useDoctorAppointment from "../../hooks/useDoctorAppointment";
import { useDoctorMessages } from "../../context/DoctorMessagesContext";
import { useNavigate } from "@/lib/navigation";
import DoctorsAdherenceView from "../../layout/DoctorsAdherenceView";
import DoctorsAppointmentModal from "../../Modal/DoctorsAppointmentModal";
import DoctorsPrescribeModal from "../../Modal/DoctorsPrescribeModal";
import MissedAppointmentModal, { canMarkMissed, MissedBadge } from "../../Modal/MissedAppointmentModal";
import JoinCallButton from "../../components/JoinCallButton";
import { CallButtons } from "../../components/calls/CallLayer";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import type { Appointment } from "../../types/index";
import { PageHeader, Pill } from "../../components/panel";
import {
  Avatar,
  criticalReason,
  DateBlock,
  dayHeading,
  isCritical,
  isOpen,
  slotStart,
  sortVisits,
  VisitPills,
  VisitTabs,
  type VisitTab,
} from "../../components/visits";

type Tab = VisitTab;

const DoctorAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { forPatient } = useDoctorMessages();
  const [noShowFor, setNoShowFor] = useState<Appointment | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [resolving, setResolving] = useState<string | null>(null);
  const {
    appointments,
    setExpandedId,
    expandedId,
    calculateAge,
    currency,
    setProgress,
    cancelAppointment,
    setSelectedApptId,
    setShowModal,
    setShowAlertModal,
    getAdherenceStats,
    alertForm,
    setAlertForm,
    showAlertModal,
    isSendingAlert,
    handleSendAlert,
    showModal,
    resetForm,
    vitals,
    setVitals,
    setMedicines,
    medicines,
    completeAppointment,
    getAppointments,
    selectedApptId,
  } = useDoctorAppointment();

  const all = appointments ?? [];
  const lists = useMemo(() => sortVisits(all), [all]);

  const shown = lists[tab];
  const tabs: { id: Tab; label: string; count: number; tone?: string }[] = [
    { id: "upcoming", label: "Upcoming", count: lists.upcoming.length },
    { id: "toClose", label: "To close", count: lists.toClose.length, tone: "bg-orange-500 text-white" },
    { id: "attention", label: "Needs attention", count: lists.attention.length, tone: "bg-rose-500 text-white" },
    { id: "completed", label: "Completed", count: lists.completed.length },
    { id: "closed", label: "Cancelled & missed", count: lists.closed.length },
  ];

  const resolve = async (a: Appointment) => {
    setResolving(a.userId);
    try {
      const { data } = await axiosInstance.post(API_PATHS.DOCTOR.RESOLVE_CRITICAL, { userId: a.userId });
      if (data.success) {
        toast.success(`${a.userData.name} is no longer marked critical`);
        await getAppointments();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setResolving(null);
    }
  };

  // upcoming visits get day headings (Today, Tomorrow, ...); the others are a plain list
  let lastDay = "";

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <PageHeader eyebrow="Your practice" title="Schedule" subtitle="Your visits, soonest first. Complete each one with vitals and prescriptions." />
        </div>

        <VisitTabs tabs={tabs} current={tab} onChange={setTab} />

        {shown.length === 0 ? (
          <div className="surface rounded-[24px] py-16 text-center">
            <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand-ink mb-4 mx-auto">
              <RiCalendarCheckLine size={24} />
            </div>
            <p className="font-bold text-ink">
              {tab === "upcoming"
                ? "No upcoming visits"
                : tab === "toClose"
                  ? "All your visits are closed"
                  : tab === "attention"
                    ? "Nobody needs attention"
                    : "Nothing here"}
            </p>
            <p className="text-ink-3 text-[14px] mt-1">
              {tab === "upcoming"
                ? "New bookings appear here as soon as they're paid."
                : tab === "toClose"
                  ? "Visits whose time has passed show up here until you complete them or mark a no-show."
                  : tab === "attention"
                    ? "Patients flagged critical will show up here."
                    : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tab === "toClose" && (
              <p className="text-[13px] text-orange-800 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                These visits&apos; time has passed. Complete each one, or mark a no-show. A visit still open 24 hours after its time counts as missed by you, and
                the patient is refunded in full.
              </p>
            )}
            {shown.map((item) => {
              const start = slotStart(item);
              const heading = tab === "upcoming" ? dayHeading(start) : "";
              const showHeading = tab === "upcoming" && heading !== lastDay;
              lastDay = heading;
              const critical = isCritical(item);
              const age = calculateAge(item.userData.dob);
              const open = isOpen(item);

              return (
                <React.Fragment key={item._id}>
                  {showHeading && <p className="text-[15px] font-bold text-ink pt-3 px-1">{heading}</p>}

                  <div className={`surface rounded-[22px] overflow-hidden ${critical ? "!border-rose-200" : ""}`}>
                    {critical && (
                      <div className="flex flex-wrap items-center gap-2 bg-rose-50 px-4 sm:px-5 py-2.5 border-b border-rose-100">
                        <RiErrorWarningFill size={16} className="text-rose-600" />
                        <p className="text-[12px] font-bold text-rose-800 flex-1">Needs attention: {criticalReason(item)}</p>
                        <button
                          onClick={() => resolve(item)}
                          disabled={resolving === item.userId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-[12px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <RiShieldCheckLine size={14} /> {resolving === item.userId ? "Saving…" : "Mark as resolved"}
                        </button>
                      </div>
                    )}

                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
                      <DateBlock item={item} />

                      {/* who and what */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar src={item.userData.image} name={item.userData.name} />
                        <div className="min-w-0">
                          <p className="text-[16px] font-bold text-ink truncate">{item.userData.name}</p>
                          <p className="text-[13px] text-ink-3">{Number.isFinite(age) && age > 0 ? `${age} years old` : "Age not given"}</p>
                          <VisitPills item={item} currency={currency} />
                        </div>
                      </div>

                      {/* what they can do */}
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {item.kind === "video" && open && <JoinCallButton appointment={item} />}
                        {!item.cancelled && <CallButtons to={item.userId} appointmentId={open ? item._id : undefined} compact />}
                        {!item.cancelled && (
                          <button
                            onClick={() => navigate(`/doctor-messages?patient=${item.userId}&appointment=${item._id}`)}
                            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white text-[13px] font-bold text-ink-2 hover:bg-canvas"
                          >
                            <RiChat3Line size={16} /> Message
                            {forPatient(item.userId) > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-teal-500 border-2 border-white" />}
                          </button>
                        )}
                        {item.missed ? (
                          <MissedBadge item={item} currency={currency} />
                        ) : item.cancelled ? (
                          <Pill tone="rose">Cancelled</Pill>
                        ) : item.isCompleted ? (
                          <button
                            onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-soft border border-teal-100 text-[13px] font-bold text-brand-ink hover:bg-teal-100"
                          >
                            <RiCheckboxCircleLine size={16} /> {expandedId === item._id ? "Hide report" : "Report & adherence"}
                            <RiArrowDownSLine size={16} className={`transition-transform ${expandedId === item._id ? "rotate-180" : ""}`} />
                          </button>
                        ) : (
                          <>
                            {canMarkMissed(item) && (
                              <button
                                onClick={() => setNoShowFor(item)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 text-[13px] font-bold text-orange-700 hover:bg-orange-50"
                              >
                                <RiUserUnfollowLine size={16} /> No-show
                              </button>
                            )}
                            <button
                              onClick={() => cancelAppointment(item._id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white text-[13px] font-bold text-ink-2 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                            >
                              <RiCloseCircleLine size={16} /> Cancel
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApptId(item._id);
                                setShowModal(true);
                              }}
                              className="btn btn-teal !py-2 !px-4 !text-[13px] !rounded-xl"
                            >
                              <RiStethoscopeLine size={16} /> Complete visit
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* vitals, prescriptions and dose adherence for completed visits */}
                    <DoctorsAdherenceView
                      item={item}
                      expandedId={expandedId}
                      setSelectedApptId={setSelectedApptId}
                      setShowAlertModal={setShowAlertModal}
                      getAdherenceStats={getAdherenceStats}
                    />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <DoctorsAppointmentModal
        showAlertModal={showAlertModal}
        alertForm={alertForm}
        setAlertForm={setAlertForm}
        isSendingAlert={isSendingAlert}
        handleSendAlert={handleSendAlert}
        setShowAlertModal={setShowAlertModal}
      />
      <DoctorsPrescribeModal
        showModal={showModal}
        resetForm={resetForm}
        vitals={vitals}
        setVitals={setVitals}
        setMedicines={setMedicines}
        medicines={medicines}
        completeAppointment={completeAppointment}
        getAppointments={getAppointments}
        setProgress={setProgress}
        selectedApptId={selectedApptId}
      />
      <MissedAppointmentModal
        appointment={noShowFor}
        role="doctor"
        currency={currency}
        onClose={() => setNoShowFor(null)}
        onDone={getAppointments}
      />
    </div>
  );
};

export default DoctorAppointment;
