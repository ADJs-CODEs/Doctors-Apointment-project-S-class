import React, { useContext } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { toast } from 'sonner'
import SkeletonCard from '../components/SkeletonCard.js'
import type { AppContextType } from '../types/index.js'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  RiMedicineBottleLine, RiArrowRightLine
} from "@remixicon/react"
import { API_PATHS } from '../utils/apiPath.js'
import axiosInstance from '../utils/axiosInstance.js'
import { useMyAppointments } from '../hooks/useMyAppointment.js'
import { getDoseStatus } from "../utils/medicationUtils.js"
import MyAppointmentCard from '../cards/MyAppointmentCard.js'
import HealthDropdown from '../inputs/HealthDropdown.js'



const MyAppointments: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { token, setProgress } = context;
  const navigate = useNavigate();

  const { cancelAppointment, getUserAppointments, expandedTrackers, toggleTracker,
    processingMed, setProcessingMed, loading, appointments
  } = useMyAppointments();



  const payStripe = async (appointmentId: string) => {
    try {
      setProgress(30);
      const { data } = await axiosInstance.post(
        API_PATHS.AUTH.STRIPE_AUTH, { appointmentId }
      );

      if (data.success) {
        const { session_url } = data;
        window.location.replace(session_url);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProgress(100);
    }
  };


  const logDose = async (appointmentId: string, medicineName: string, med: any) => {
    if (processingMed) return;
    const { isEarly } = getDoseStatus(med);
    let overdoseAlert = false;

    if (isEarly) {
      const confirm = window.confirm(`⚠️ WARNING: Early dose for ${medicineName}. This will notify your doctor. Log anyway?`);
      if (!confirm) return;
      overdoseAlert = true;
    }

    try {
      setProcessingMed(`${appointmentId}-${medicineName}`);
      setProgress(40);
      const { data } = await axiosInstance.post(API_PATHS.USER.LOG_DOSE,
        { appointmentId, medicineName, overdoseAlert }
      );
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-5xl mx-auto p-4 md:p-6 py-12 md:py-20 bg-slate-50 min-h-screen relative'>

      {/* --- PHARMACY VAULT FAB --- */}
      <button
        onClick={() => navigate('/medication-history')}
        className='fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 bg-slate-900 text-white p-4 md:p-5 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all flex items-center gap-3 group border border-white/10'
      >
        <RiMedicineBottleLine size={20} className='md:size-6 group-hover:rotate-12 transition-transform' />
        <span className='max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap text-xs md:text-sm uppercase tracking-widest'>
          Pharmacy Vault
        </span>
        <RiArrowRightLine size={16} className='opacity-0 group-hover:opacity-100 transition-opacity' />
      </button>

      <div className='flex justify-between items-end mb-8 md:mb-12 border-b pb-6 md:pb-8'>
        <h1 className='text-2xl md:text-4xl font-black text-slate-900 uppercase'>
          My <span className='text-teal-500 italic'>Appointments</span>
        </h1>
      </div>

      <div className='space-y-8 md:space-y-12 mb-20'>
        {loading ? <SkeletonCard type="row" /> : appointments.map((item) => {
          const isCritical = item.patientStatus === 'Critical';
          const latestMessage = item.messages && item.messages.length > 0 ? item.messages[item.messages.length - 1] : null;
          const isExpanded = expandedTrackers[item._id] || false;

          return (
            <div key={item._id} className='flex flex-col gap-4'>
              {/* --- Doctor Card --- */}
              <MyAppointmentCard
                item={item}
                isCritical={item.patientStatus === 'Critical'}
                isExpanded={!!expandedTrackers[item._id]}
                onViewReport={toggleTracker}
                payStripe={payStripe}
                cancelAppointment={cancelAppointment}
                toggleTracker={toggleTracker}
              />

              {/* --- Health Tracker Dropdown Section --- */}
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
        })}
      </div>
    </motion.div>
  );
}

export default MyAppointments;