import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { toast } from 'sonner'
import axios from 'axios'
import SkeletonCard from '../components/SkeletonCard.js'
import type { AppContextType, Appointment } from '../types/index.js'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  RiMedicineBottleLine,
  RiErrorWarningLine,
  RiHeartPulseLine,
  RiTempHotLine,
  RiDashboardLine,
  RiArrowRightLine,
  RiArrowDownSLine, // Added for dropdown
  RiShieldCheckLine,
  RiCheckDoubleLine
} from "@remixicon/react"

const MyAppointments: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { backendUrl, token, setProgress } = context;
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [processingMed, setProcessingMed] = useState<string | null>(null)
  
  // --- NEW: Toggle State ---
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleDetails = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getUserAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
      if (data.success) {
        setAppointments(data.appointments.reverse())
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const payStripe = async (appointmentId: string) => {
    try {
      setProgress(30);
      const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } });
      if (data.success) window.location.replace(data.session_url);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProgress(100);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      setProgress(40);
      const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } });
      if (data.success) { toast.success(data.message); getUserAppointments(); }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProgress(100);
    }
  };

  const getDoseStatus = (med: any) => {
    if (!med.lastTaken) return { isEarly: false, hoursLeft: "0" };
    const gap = med.frequencyType === 'daily' ? (24 / (med.dosagePerDay || 1)) : (med.dosagePerDay || 4);
    const now = new Date().getTime();
    const last = new Date(med.lastTaken).getTime();
    const diffHours = (now - last) / (1000 * 60 * 60);
    return { isEarly: diffHours < gap, hoursLeft: Math.max(0, gap - diffHours).toFixed(1) };
  }

  const getAdherenceStats = (med: any) => {
    const total = med.totalQuantity || 1;
    const remaining = med.remainingQuantity ?? total;
    const rate = Math.min(100, Math.round(((total - remaining) / total) * 100));
    return { rate };
  };

  const logDose = async (appointmentId: string, medicineName: string, med: any) => {
    if (processingMed) return;
    const { isEarly } = getDoseStatus(med);
    if (isEarly && !window.confirm(`⚠️ Early dose for ${medicineName}. Log anyway?`)) return;

    try {
      setProcessingMed(`${appointmentId}-${medicineName}`);
      setProgress(40);
      const { data } = await axios.post(`${backendUrl}/api/user/update-dose`, { appointmentId, medicineName, overdoseAlert: isEarly }, { headers: { token } });
      if (data.success) { toast.success(`${medicineName} logged!`); await getUserAppointments(); }
    } catch (error: any) {
      toast.error("Failed to update dose");
    } finally {
      setProgress(100); setProcessingMed(null);
    }
  };

  const slotDateFormat = (slotDate: string) => {
    const dateArray = slotDate.split('_')
    return `${dateArray[0]} ${dateArray[1]} ${dateArray[2]}`
  }

  useEffect(() => { if (token) getUserAppointments() }, [token])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-5xl mx-auto px-4 py-12 bg-slate-50 min-h-screen relative'>

      <button onClick={() => navigate('/medication-history')} className='fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-full shadow-2xl active:scale-90 border border-white/10'>
        <RiMedicineBottleLine size={24} />
      </button>

      <div className='mb-8 border-b border-slate-200 pb-6'>
        <h1 className='text-2xl font-black text-slate-900 uppercase'>My Appointments</h1>
      </div>

      <div className='space-y-6'>
        {loading ? <SkeletonCard type="row" /> : appointments.map((item) => {
          const isCritical = item.patientStatus === 'Critical';
          const isExpanded = expandedId === item._id;

          return (
            <div key={item._id} className='flex flex-col gap-2'>
              {/* --- Main Appointment Toggle Bar --- */}
              <div 
                onClick={() => item.isCompleted && toggleDetails(item._id)}
                className={`bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex flex-col md:flex-row gap-4 items-center shadow-sm border transition-all cursor-pointer ${isCritical ? 'border-red-500 bg-red-50/10' : 'border-slate-100'}`}
              >
                <img className='w-16 h-16 md:w-24 md:h-24 rounded-2xl object-cover bg-slate-100 border-2 border-white' src={item.docData?.image} alt="" />
                
                <div className='flex-1 text-center md:text-left'>
                  <p className='text-lg font-black text-slate-900'>{item.docData?.name}</p>
                  <p className='text-teal-600 font-bold uppercase text-[8px] tracking-widest'>{item.docData?.speciality}</p>
                  <p className='text-[10px] text-slate-400 font-bold mt-1'>{slotDateFormat(item.slotDate)} | {item.slotTime}</p>
                </div>

                <div className='flex items-center gap-3 w-full md:w-auto'>
                  <div className='flex-1 flex gap-2'>
                    {!item.cancelled && !item.isCompleted && !item.payment && (
                      <button onClick={(e) => { e.stopPropagation(); payStripe(item._id); }} className='flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-[9px] uppercase'>Pay</button>
                    )}
                    {item.isCompleted && (
                      <div className='flex-1 px-4 py-2 bg-teal-50 text-teal-600 rounded-lg font-black text-[9px] uppercase text-center border border-teal-100'>Completed</div>
                    )}
                  </div>
                  
                  {/* Dropdown Arrow Indicator */}
                  {item.isCompleted && (
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className='text-slate-300'>
                      <RiArrowDownSLine size={24} />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* --- Expandable Content --- */}
              <AnimatePresence>
                {isExpanded && item.healthData && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className='overflow-hidden'
                  >
                    <div className={`rounded-[24px] md:rounded-[32px] p-6 text-white mt-1 ${isCritical ? 'bg-gradient-to-br from-red-950 via-slate-900 to-black' : 'bg-slate-900'}`}>
                      
                      {/* Vitals */}
                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8'>
                        {[
                          { icon: <RiHeartPulseLine size={20} className='text-rose-400' />, label: 'Pulse', value: item.healthData.heartRate, unit: 'BPM' },
                          { icon: <RiDashboardLine size={20} className='text-blue-400' />, label: 'BP', value: item.healthData.bloodPressure, unit: '' },
                          { icon: <RiTempHotLine size={20} className='text-orange-400' />, label: 'Temp', value: item.healthData.temperature, unit: '°C' }
                        ].map((v, i) => (
                          <div key={i} className='bg-white/5 p-4 rounded-xl border border-white/10'>
                            <div className='flex items-center gap-2 mb-1'>{v.icon}<span className='text-[8px] text-slate-400 font-black uppercase'>{v.label}</span></div>
                            <p className='text-xl font-black'>{v.value || '--'} <span className='text-[9px] text-slate-500'>{v.unit}</span></p>
                          </div>
                        ))}
                      </div>

                      {/* Meds */}
                      <div className='space-y-3'>
                        <h3 className='text-[9px] font-black uppercase tracking-widest text-teal-400 mb-2'>Active Prescriptions</h3>
                        {item.healthData.prescribedMedicines?.map((med: any) => {
                          const { isEarly, hoursLeft } = getDoseStatus(med);
                          const isProcessing = processingMed === `${item._id}-${med.name}`;

                          return (
                            <div key={med.name} className='bg-white/5 rounded-xl p-4 border border-white/5 flex justify-between items-center gap-4'>
                              <div className='flex items-center gap-3'>
                                <RiMedicineBottleLine className='text-teal-400' size={20} />
                                <div>
                                  <p className='font-bold text-sm'>{med.name}</p>
                                  <p className='text-[8px] text-slate-500 uppercase'>{med.remainingQuantity} Doses Remaining</p>
                                </div>
                              </div>
                              <button
                                onClick={() => logDose(item._id, med.name, med)}
                                disabled={med.remainingQuantity <= 0 || !!processingMed}
                                className={`px-5 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${isProcessing ? 'bg-slate-700 animate-pulse' : isEarly ? 'bg-red-600 text-white' : 'bg-teal-500 text-slate-900'}`}
                              >
                                {isProcessing ? '...' : isEarly ? `Wait ${hoursLeft}h` : 'Log'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
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