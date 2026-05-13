import React, { useContext, useEffect, useRef } from "react";
import { AppContext } from "../Context/AppContext.js";
import type { AppContextType } from "../types/index.js";
import { motion, AnimatePresence } from "framer-motion";
import { RiMedicineBottleLine, RiArrowRightLine } from "@remixicon/react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { API_PATHS } from "../utils/apiPath.js";
import axiosInstance from "../utils/axiosInstance.js";
import { useMyAppointments } from "../hooks/useMyAppointment.js";
import { getDoseStatus } from "../utils/medicationUtils.js";
import MyAppointmentCard from "../cards/MyAppointmentCard.js";
import HealthDropdown from "../inputs/HealthDropdown.js";
import SkeletonCard from "../components/SkeletonCard.js";

const MyAppointments: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { token, setProgress } = context;
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
    processingMed,
    setProcessingMed,
    loading,
    appointments,
  } = useMyAppointments();

  // Scroll to and highlight the target appointment
  useEffect(() => {
    if (!highlightId || loading) return;
    const el = cardRefs.current[highlightId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [highlightId, loading]);

  const payStripe = async (appointmentId: string) => {
    try {
      setProgress(30);
      const { data } = await axiosInstance.post(API_PATHS.AUTH.STRIPE_AUTH, {
        appointmentId,
      });
      if (data.success) {
        window.location.replace(data.session_url);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProgress(100);
    }
  };

  const logDose = async (
    appointmentId: string,
    medicineName: string,
    med: any,
  ) => {
    if (processingMed) return;
    const { isEarly } = getDoseStatus(med);
    let overdoseAlert = false;

    if (isEarly) {
      const confirm = window.confirm(
        `⚠️ WARNING: Early dose for ${medicineName}. This will notify your doctor. Log anyway?`,
      );
      if (!confirm) return;
      overdoseAlert = true;
    }

    try {
      setProcessingMed(`${appointmentId}-${medicineName}`);
      setProgress(40);
      const { data } = await axiosInstance.post(API_PATHS.USER.LOG_DOSE, {
        appointmentId,
        medicineName,
        overdoseAlert,
      });
      if (data.success) {
        toast.success(data.message || `${medicineName} logged!`);
        await getUserAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to log dose");
    } finally {
      setProgress(100);
      setProcessingMed(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-4 py-10 md:py-16 min-h-screen relative"
    >
      {/* Pharmacy Vault FAB */}
      <button
        onClick={() => navigate("/medication-history")}
        className="fixed bottom-6 right-4 md:bottom-10 md:right-10 z-50 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all flex items-center gap-3 group border border-white/10"
      >
        <RiMedicineBottleLine
          size={20}
          className="group-hover:rotate-12 transition-transform"
        />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap text-xs uppercase tracking-widest">
          Pharmacy Vault
        </span>
        <RiArrowRightLine
          size={16}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </button>

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
                      From Pharmacy Vault
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
                      logDose={logDose}
                      processingMed={processingMed}
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default MyAppointments;
