"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Appointment, MedicationsFocus } from "../types/index";
import PayAppointmentModal from "../components/patient/PayAppointmentModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiArrowRightLine,
  RiCalendarCheckLine,
  RiStethoscopeLine,
} from "@remixicon/react";
import { useNavigate, useLocation } from "@/lib/navigation";
import { useMyAppointments } from "../hooks/useMyAppointment";
import MyAppointmentCard from "../cards/MyAppointmentCard";
import HealthDropdown from "../inputs/HealthDropdown";
import SkeletonCard from "../components/SkeletonCard";

const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Read highlight ID passed from MedHistory
  const highlightId = (location.state as any)?.highlightId as
    | string
    | undefined;

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const {
    cancelAppointment,
    getUserAppointments,
    expandedTrackers,
    toggleTracker,
    loading,
    appointments,
  } = useMyAppointments();

  // Scroll to the appointment we were sent here for and open its report
  useEffect(() => {
    if (!highlightId || loading) return;
    const el = cardRefs.current[highlightId];
    if (el) {
      if (!expandedTrackers[highlightId]) toggleTracker(highlightId);
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
    // only when arriving with a highlight, not on every expand/collapse
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, loading]);

  // "Pay" opens the choice: wallet or card
  const [payFor, setPayFor] = useState<Appointment | null>(null);
  const payStripe = (appointmentId: string) =>
    setPayFor(appointments.find((a) => a._id === appointmentId) ?? null);

  // doses are logged on the Medications tab; send the patient to this visit there
  const openMedications = (visitId: string, medicine?: string) => {
    const focus: MedicationsFocus = { visitId, medicine };
    navigate("/medication-history", { state: focus });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-4 py-10 md:py-16 min-h-screen relative"
    >
      {/* Header */}
      <div className="flex justify-between items-end mb-8 md:mb-12 border-b pb-6 border-slate-100">
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase">
          My{" "}
          <span className="text-teal-500 italic font-serif normal-case">
            Appointments
          </span>
        </h1>
        {highlightId && (
          <p className="text-[10px] font-black uppercase tracking-widest text-teal-500 hidden sm:block animate-pulse">
            ↓ Highlighted below
          </p>
        )}
      </div>

      <div className="space-y-6 md:space-y-8 mb-24">
        {loading ? (
          <SkeletonCard type="row" />
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-clinical px-6 py-14 md:py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-teal-50 flex items-center justify-center">
              <RiCalendarCheckLine size={30} className="text-teal-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">
              You haven&apos;t booked an appointment yet
            </h2>
            <p className="text-slate-500 mt-3 max-w-md mx-auto leading-relaxed">
              Find a doctor that fits what you need, pick a time that works for you, and
              your visits, prescriptions and reports will all show up here.
            </p>
            <button
              onClick={() => navigate("/doctors")}
              className="mt-8 inline-flex items-center gap-2 bg-slate-900 hover:bg-teal-600 text-white px-7 py-3.5 rounded-2xl text-sm font-bold transition-colors"
            >
              <RiStethoscopeLine size={18} />
              Find a doctor
              <RiArrowRightLine size={16} />
            </button>
          </div>
        ) : (
          appointments.map((item) => {
            const isCritical = item.patientStatus === "Critical";
            const latestMessage = item.messages?.length
              ? item.messages[item.messages.length - 1]
              : null;
            const isExpanded = expandedTrackers[item._id] || false;
            const isHighlighted = item._id === highlightId;

            return (
              <div
                key={item._id}
                ref={(el) => {
                  cardRefs.current[item._id] = el;
                }}
                className="flex flex-col gap-4"
              >
                {/* Highlighted ring wrapper */}
                <div
                  className={`rounded-[32px] md:rounded-[40px] transition-all duration-700 ${
                    isHighlighted
                      ? "ring-4 ring-teal-400 ring-offset-2 shadow-[0_0_32px_rgba(20,184,166,0.25)]"
                      : ""
                  }`}
                >
                  {isHighlighted && (
                    <div className="bg-teal-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-t-[28px] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      From Medications
                    </div>
                  )}
                  <MyAppointmentCard
                    item={item}
                    isCritical={isCritical}
                    isExpanded={isExpanded}
                    onViewReport={toggleTracker}
                    payStripe={payStripe}
                    cancelAppointment={cancelAppointment}
                    toggleTracker={toggleTracker}
                  />
                </div>

                <AnimatePresence>
                  {item.isCompleted && item.healthData && isExpanded && (
                    <HealthDropdown
                      item={item}
                      isCritical={isCritical}
                      latestMessage={latestMessage}
                      openMedications={openMedications}
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      <PayAppointmentModal appointment={payFor} onClose={() => setPayFor(null)} onPaid={getUserAppointments} />
    </motion.div>
  );
};

export default MyAppointments;
