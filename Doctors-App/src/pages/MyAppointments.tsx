import React, { useContext, useEffect, useState, useMemo } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { toast } from 'sonner'
import axios from 'axios'
import SkeletonCard from '../components/SkeletonCard.js'
import type { AppContextType, Appointment, PrescribedMedicine } from '../types/index.js'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  RiMedicineBottleLine,
  RiErrorWarningLine,
  RiHeartPulseLine,
  RiTempHotLine,
  RiDashboardLine,
  RiMessage3Line,
  RiArrowRightLine,
  RiShieldCheckLine,
  RiCheckDoubleLine,
  RiSearchLine,
  RiCloseLine,
  RiArrowDownSLine
} from "@remixicon/react"

const MyAppointments: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { backendUrl, token, setProgress } = context;
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [processingMed, setProcessingMed] = useState<string | null>(null)

  // UI ONLY STATES
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  // SEARCH LOGIC (UI ONLY)
  const filteredAppointments = useMemo(() => {
    return appointments.filter(item =>
      item.docData?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.docData?.speciality.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, appointments])

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

  // RESTORED: YOUR ORIGINAL LOGIC
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
    const taken = total - remaining;
    const rate = Math.min(100, Math.round((taken / total) * 100));
    return { rate };
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
      const { data } = await axios.post(`${backendUrl}/api/user/update-dose`, { appointmentId, medicineName, overdoseAlert }, { headers: { token } });
      if (data.success) { toast.success(data.message || `${medicineName} logged!`); await getUserAppointments(); }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to log dose");
    } finally {
      setProgress(100); setProcessingMed(null);
    }
  };

  const slotDateFormat = (slotDate: string) => {
    const dateArray = slotDate.split('_')
    return dateArray[0] + " " + dateArray[1] + " " + dateArray[2]
  }

  useEffect(() => { if (token) getUserAppointments() }, [token])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-5xl mx-auto px-4 py-12 md:py-20 bg-slate-50 min-h-screen relative'>

      {/* MOBILE FAB */}
      <button onClick={() => navigate('/medication-history')} className='fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 bg-slate-900 text-white p-4 rounded-full shadow-2xl active:scale-95 border border-white/10'>
        <RiMedicineBottleLine size={24} />
      </button>

      <div className='flex flex-col gap-6 mb-12 border-b pb-8'>
        <h1 className='text-2xl md:text-4xl font-black text-slate-900 uppercase'>
          My <span className='text-teal-500 italic'>Appointments</span>
        </h1>

        {/* SEARCH BAR UI */}
        <div className='relative'>
          <RiSearchLine className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' size={18} />
          <input
            type="text" placeholder="Filter appointments..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all shadow-sm'
          />
        </div>
      </div>

      <div className='space-y-4 md:space-y-8 mb-20'>
        {loading ? <SkeletonCard type="row" /> : filteredAppointments.map((item) => {
          const isCritical = item.patientStatus === 'Critical';
          const latestMessage = item.messages && item.messages.length > 0 ? item.messages[item.messages.length - 1] : null;
          const isExpanded = expandedId === item._id;

          return (
            <div key={item._id} className='flex flex-col gap-2'>
              {/* DOCTOR CARD - TRIGGER FOR DROPDOWN */}
              <div
                onClick={() => item.isCompleted && setExpandedId(isExpanded ? null : item._id)}
                className={`bg-white p-4 md:p-6 rounded-[24px] md:rounded-[40px] flex flex-col md:flex-row gap-4 md:gap-8 items-center shadow-sm border transition-all ${isCritical ? 'border-red-500 bg-red-50/30' : 'border-slate-100'} ${item.isCompleted ? 'cursor-pointer active:bg-slate-50' : ''}`}
              >
                <div className='relative shrink-0'>
                  <img className='w-20 h-20 md:w-32 md:h-32 rounded-2xl md:rounded-[32px] object-cover bg-slate-100 border-2 border-white' src={item.docData?.image} alt="" />
                  {isCritical && <div className='absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full animate-bounce'><RiErrorWarningLine size={16} /></div>}
                </div>

                <div className='flex-1 text-center md:text-left'>
                  <p className='text-lg md:text-2xl font-black text-slate-900'>{item.docData?.name}</p>
                  <p className='text-teal-600 font-bold uppercase text-[8px] md:text-[10px] tracking-widest'>{item.docData?.speciality}</p>
                  <p className='text-[10px] text-slate-500 font-bold mt-1'>{slotDateFormat(item.slotDate)} | {item.slotTime}</p>
                </div>

                <div className='flex items-center gap-3 w-full md:w-auto'>
                  <div className='flex-1 flex flex-col gap-2'>
                    {!item.cancelled && !item.isCompleted && !item.payment && (
                      <button onClick={(e) => { e.stopPropagation(); payStripe(item._id); }} className='w-full px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase'>Pay</button>
                    )}
                    {item.isCompleted && (
                      <div className='px-4 py-2 bg-teal-50 text-teal-600 rounded-xl font-black text-[9px] uppercase border border-teal-100'>Completed</div>
                    )}
                  </div>
                  {item.isCompleted && (
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className='text-slate-300'>
                      <RiArrowDownSLine size={24} />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* DROPDOWN CONTENT */}
              <AnimatePresence>
                {isExpanded && item.healthData && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className='overflow-hidden'>
                    <div className={`rounded-[32px] p-6 md:p-10 text-white mt-1 ${isCritical ? 'bg-gradient-to-br from-red-950 via-slate-900 to-black' : 'bg-slate-900'}`}>

                      {/* RESTORED: MESSAGES LOGIC */}
                      {latestMessage && (
                        <div className={`mb-8 p-5 rounded-2xl border-l-4 flex gap-4 items-start bg-white/5 ${isCritical ? 'border-red-500' : 'border-teal-500'}`}>
                          <RiMessage3Line className={isCritical ? 'text-red-500' : 'text-teal-500'} size={24} />
                          <div>
                            <p className='text-[8px] font-black uppercase text-slate-400 mb-1'>Doctor's Note</p>
                            <p className='text-sm italic text-slate-100'>"{latestMessage.content}"</p>
                          </div>
                        </div>
                      )}

                      {/* VITALS */}
                      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
                        {[
                          { icon: <RiHeartPulseLine size={20} className='text-rose-400' />, label: 'Pulse', value: item.healthData.heartRate, unit: 'BPM' },
                          { icon: <RiDashboardLine size={20} className='text-blue-400' />, label: 'BP', value: item.healthData.bloodPressure, unit: '' },
                          { icon: <RiTempHotLine size={20} className='text-orange-400' />, label: 'Temp', value: item.healthData.temperature, unit: '°C' }
                        ].map((v, i) => (
                          <div key={i} className='bg-white/5 border border-white/10 p-4 rounded-2xl'>
                            <div className='flex items-center gap-2 mb-1'>{v.icon}<span className='text-[8px] text-slate-400 font-bold uppercase'>{v.label}</span></div>
                            <p className='text-xl font-black'>{v.value || '--'} <span className='text-[10px] text-slate-500'>{v.unit}</span></p>
                          </div>
                        ))}
                      </div>

                      {/* RESTORED: ADHERENCE & MEDS LOGIC */}
                      <div className='space-y-4'>
                        {item.healthData.prescribedMedicines?.map((med: any) => {
                          const { isEarly, hoursLeft } = getDoseStatus(med);
                          const { rate } = getAdherenceStats(med);
                          const isProcessing = processingMed === `${item._id}-${med.name}`;

                          return (
                            <div key={med.name} className='bg-white/5 rounded-2xl p-5 border border-white/5'>
                              <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
                                <div className='w-full flex-1'>
                                  <div className='flex justify-between items-center mb-2'>
                                    <p className='font-bold text-base'>{med.name}</p>
                                    <span className='text-[10px] font-black text-teal-400'>{rate}% Adherence</span>
                                  </div>

                                  {/* ADHERENCE BAR */}
                                  <div className='h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-3'>
                                    <motion.div
                                      initial={{ width: 0 }} animate={{ width: `${rate}%` }}
                                      className={`h-full ${rate > 80 ? 'bg-teal-500' : 'bg-orange-500'}`}
                                    />
                                  </div>
                                  <p className='text-[9px] text-slate-500 uppercase font-bold'>{med.remainingQuantity} Doses Left</p>
                                </div>

                                <button
                                  onClick={() => logDose(item._id, med.name, med)}
                                  disabled={med.remainingQuantity <= 0 || !!processingMed}
                                  className={`w-full md:w-auto px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest ${isProcessing ? 'bg-slate-700 animate-pulse' : isEarly ? 'bg-red-600' : 'bg-teal-500 text-slate-900'}`}
                                >
                                  {isProcessing ? '...' : isEarly ? `Wait ${hoursLeft}h` : 'Log Dose'}
                                </button>
                              </div>
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