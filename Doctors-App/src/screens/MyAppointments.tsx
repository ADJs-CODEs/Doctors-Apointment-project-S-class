"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Appointment, MedicationsFocus } from "../types/index";
import PayAppointmentModal from "../components/patient/PayAppointmentModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import { RiAddLine, RiArrowRightLine, RiCalendarCheckLine, RiCalendarCloseLine, RiStethoscopeLine } from "@remixicon/react";
import { Link, useNavigate, useLocation } from "@/lib/navigation";
import { useMyAppointments } from "../hooks/useMyAppointment";
import MyAppointmentCard from "../cards/MyAppointmentCard";
import HealthDropdown from "../inputs/HealthDropdown";
import { isUpcomingVisit as isUpcoming, visitStart as startTime } from "../utils/patientRecords";

type Tab = "upcoming" | "past";

const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Read highlight ID passed from MedHistory
  const highlightId = (location.state as any)?.highlightId as string | undefined;

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { cancelAppointment, getUserAppointments, expandedTrackers, toggleTracker, loading, appointments } =
    useMyAppointments();

  // upcoming soonest first, past most recent first
  const { upcoming, past } = useMemo(() => {
    const up = appointments.filter(isUpcoming).sort((a, b) => startTime(a) - startTime(b));
    const done = appointments.filter((a) => !isUpcoming(a)).sort((a, b) => startTime(b) - startTime(a));
    return { upcoming: up, past: done };
  }, [appointments]);

  const [tab, setTab] = useState<Tab>("upcoming");
  // nothing coming up: start on the history instead of an empty tab
  useEffect(() => {
    if (!loading && !upcoming.length && past.length) setTab("past");
  }, [loading, upcoming.length, past.length]);

  // Scroll to the appointment we were sent here for and open its report
  useEffect(() => {
    if (!highlightId || loading) return;
    const target = appointments.find((a) => a._id === highlightId);
    if (!target) return;
    setTab(isUpcoming(target) ? "upcoming" : "past");
    if (!expandedTrackers[highlightId]) toggleTracker(highlightId);
    setTimeout(() => {
      cardRefs.current[highlightId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    // only when arriving with a highlight, not on every expand/collapse
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, loading]);

  // "Pay" opens the choice: wallet or card
  const [payFor, setPayFor] = useState<Appointment | null>(null);
  const payStripe = (appointmentId: string) => setPayFor(appointments.find((a) => a._id === appointmentId) ?? null);

  // cancelling is one tap away from losing the time, so ask first
  const [cancelFor, setCancelFor] = useState<Appointment | null>(null);
  const askCancel = (appointmentId: string) => setCancelFor(appointments.find((a) => a._id === appointmentId) ?? null);
  const heldOnly = !!cancelFor?.holdExpiresAt && !cancelFor?.payment;

  // doses are logged on the Medications tab; send the patient to this visit there
  const openMedications = (visitId: string, medicine?: string) => {
    const focus: MedicationsFocus = { visitId, medicine };
    navigate("/medication-history", { state: focus });
  };

  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5">Your visits</p>
          <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink">
            Appointments
          </h1>
        </div>
        <Link to="/doctors" className="btn btn-ink self-start sm:self-auto lg:hidden">
          <RiAddLine size={18} /> Book a visit
        </Link>
      </div>

      {!loading && appointments.length > 0 && (
        <div role="tablist" aria-label="Appointments" className="glass inline-flex rounded-[16px] p-1 mb-5">
          {(
            [
              ["upcoming", "Upcoming", upcoming.length],
              ["past", "Past", past.length],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] text-[15px] font-bold transition-colors ${
                tab === key ? "btn-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {label}
              <span className={`num text-[12px] px-1.5 rounded-full ${tab === key ? "bg-white/20" : "bg-line text-ink-3"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4 mb-16">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => <div key={i} className="h-32 rounded-[22px] bg-line/70 animate-pulse" />)
        ) : appointments.length === 0 ? (
          <div className="glass rounded-[24px] px-6 py-14 text-center">
            <span className="w-14 h-14 mx-auto mb-5 rounded-[16px] grid place-items-center bg-brand-soft text-brand-ink border border-[#C4E8E5]">
              <RiCalendarCheckLine size={26} />
            </span>
            <h2 className="text-[22px] font-extrabold text-ink">You haven&apos;t booked a visit yet</h2>
            <p className="text-[15px] text-ink-2 mt-2 max-w-md mx-auto leading-relaxed">
              Find a doctor that fits what you need and pick a time that works for you. Your visits, prescriptions
              and reports will all show up here.
            </p>
            <button type="button" onClick={() => navigate("/doctors")} className="btn btn-ink mt-6">
              <RiStethoscopeLine size={18} /> Find a doctor <RiArrowRightLine size={16} />
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="glass rounded-[22px] px-6 py-10 text-center">
            <p className="text-[17px] font-bold text-ink">
              {tab === "upcoming" ? "Nothing coming up" : "No past visits yet"}
            </p>
            <p className="text-[15px] text-ink-3 mt-1">
              {tab === "upcoming" ? "Book a clinic visit or a video call whenever you need one." : "Visits you've had will be listed here."}
            </p>
            {tab === "upcoming" && (
              <Link to="/doctors" className="btn btn-ink mt-5 !py-2.5 !text-[14px]">
                <RiAddLine size={16} /> Book a visit
              </Link>
            )}
          </div>
        ) : (
          shown.map((item) => {
            const isCritical = item.patientStatus === "Critical";
            const latestMessage = item.messages?.length ? item.messages[item.messages.length - 1] : null;
            const isExpanded = expandedTrackers[item._id] || false;
            const isHighlighted = item._id === highlightId;

            return (
              <div
                key={item._id}
                ref={(el) => {
                  cardRefs.current[item._id] = el;
                }}
                className="flex flex-col gap-3"
              >
                <div
                  className={`rounded-[22px] transition-shadow duration-700 ${
                    isHighlighted ? "ring-[3px] ring-brand ring-offset-2 ring-offset-canvas" : ""
                  }`}
                >
                  <MyAppointmentCard
                    item={item}
                    isCritical={isCritical}
                    isExpanded={isExpanded}
                    onViewReport={toggleTracker}
                    payStripe={payStripe}
                    cancelAppointment={askCancel}
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
      <ConfirmDialog
        open={!!cancelFor}
        danger
        icon={<RiCalendarCloseLine size={22} />}
        title={heldOnly ? "Let this time go?" : "Cancel this visit?"}
        body={
          heldOnly
            ? "You haven't paid yet, so nothing is charged. Someone else may book this time."
            : cancelFor?.paymentMethod === "wallet"
              ? `Your visit with ${cancelFor?.docData?.name} is cancelled and the full fee goes back into your wallet.`
              : cancelFor?.payment
                ? `Your visit with ${cancelFor?.docData?.name} is cancelled and the full fee goes back to your card. It can take 5 to 10 days to show.`
                : `Your visit with ${cancelFor?.docData?.name} is cancelled.`
        }
        cancelLabel="Keep it"
        confirmLabel={heldOnly ? "Let it go" : "Cancel visit"}
        busyLabel="Cancelling…"
        onCancel={() => setCancelFor(null)}
        onConfirm={async () => {
          if (cancelFor) await cancelAppointment(cancelFor._id);
          setCancelFor(null);
        }}
      />
    </motion.div>
  );
};

export default MyAppointments;
