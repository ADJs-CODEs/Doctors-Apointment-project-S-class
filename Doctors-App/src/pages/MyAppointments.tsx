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
  RiMessage3Line,
  RiArrowRightLine,
  RiShieldCheckLine
} from "@remixicon/react"

const MyAppointments: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { backendUrl, token, setProgress } = context;
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [processingMed, setProcessingMed] = useState<string | null>(null)

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

  // --- STRIPE PAYMENT HANDLER ---
  const payStripe = async (appointmentId: string) => {
    try {
      setProgress(30);
      const { data } = await axios.post(
        backendUrl + '/api/user/payment-stripe',
        { appointmentId },
        { headers: { token } }
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

  // --- CANCEL APPOINTMENT HANDLER ---
  const cancelAppointment = async (appointmentId: string) => {
    try {
      setProgress(40);
      const { data } = await axios.post(
        backendUrl + '/api/user/cancel-appointment',
        { appointmentId },
        { headers: { token } }
      );

      if (data.success) {
        toast.success(data.message);
        getUserAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProgress(100);
    }
  };

  const getDoseStatus = (med: any) => {
    if (!med.lastTaken) return { isEarly: false, hoursLeft: 0 };
    const requiredGap = med.dosagePerDay > 0 ? 24 / med.dosagePerDay : 4;
    const now = new Date().getTime();
    const last = new Date(med.lastTaken).getTime();
    const diffHours = (now - last) / (1000 * 60 * 60);

    return {
      isEarly: diffHours < requiredGap,
      hoursLeft: Math.max(0, requiredGap - diffHours).toFixed(1)
    };
  }

  const logDose = async (appointmentId: string, medicineName: string, med: any) => {
    if (processingMed) return;
    const { isEarly } = getDoseStatus(med);
    let overdoseAlert = false;

    if (isEarly) {
      const confirm = window.confirm(`⚠️ WARNING: Early dose for ${medicineName}. Log anyway?`);
      if (!confirm) return;
      overdoseAlert = true;
    }

    try {
      setProcessingMed(`${appointmentId}-${medicineName}`);
      setProgress(40);
      const { data } = await axios.post(`${backendUrl}/api/user/update-dose`, { appointmentId, medicineName, overdoseAlert }, { headers: { token } });
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

  const slotDateFormat = (slotDate: string) => {
    const dateArray = slotDate.split('_')
    return dateArray[0] + " " + dateArray[1] + " " + dateArray[2]
  }

  useEffect(() => {
    if (token) getUserAppointments()
  }, [token])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-5xl mx-auto p-6 py-20 bg-slate-50 min-h-screen relative'>

      {/* --- FLOATING ACTION BUTTON --- */}
      <button
        onClick={() => navigate('/medication-history')}
        className='fixed bottom-10 right-10 z-50 bg-slate-900 text-white p-5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-all flex items-center gap-3 group border border-white/10'
      >
        <RiMedicineBottleLine size={24} className='group-hover:rotate-12 transition-transform' />
        <span className='max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap text-sm uppercase tracking-widest'>
          Pharmacy Vault
        </span>
        <RiArrowRightLine size={18} className='opacity-0 group-hover:opacity-100 transition-opacity' />
      </button>

      <div className='flex justify-between items-end mb-12 border-b pb-8'>
        <h1 className='text-4xl font-black text-slate-900 uppercase'>
          My <span className='text-teal-500 italic'>Appointments</span>
        </h1>
      </div>

      <div className='space-y-12 mb-20'>
        {loading ? <SkeletonCard type="row" /> : appointments.map((item) => {
          const isCritical = item.patientStatus === 'Critical';
          const latestMessage = item.messages && item.messages.length > 0 ? item.messages[item.messages.length - 1] : null;

          return (
            <div key={item._id} className='flex flex-col gap-4'>
              {/* --- Doctor Info Card --- */}
              <div className={`bg-white p-6 rounded-[40px] flex flex-col md:flex-row gap-8 items-center shadow-sm border transition-all duration-500 ${isCritical ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.15)] bg-red-50/30' : 'border-slate-100'}`}>
                <div className='relative'>
                  <img className='w-32 h-32 rounded-[32px] object-cover bg-slate-100 border-4 border-white shadow-sm' src={item.docData?.image} alt="" />
                  {isCritical && (
                    <div className='absolute -top-2 -right-2 bg-red-600 text-white p-2 rounded-full animate-bounce shadow-lg'>
                      <RiErrorWarningLine size={20} />
                    </div>
                  )}
                </div>

                <div className='flex-1 text-center md:text-left'>
                  <div className='flex flex-col md:flex-row md:items-center gap-3'>
                    <p className='text-2xl font-black text-slate-900'>{item.docData?.name}</p>
                    {isCritical && (
                      <span className='bg-red-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest animate-pulse w-fit mx-auto md:mx-0'>
                        Urgent Action Required
                      </span>
                    )}
                  </div>
                  <p className='text-teal-600 font-bold uppercase text-[10px] tracking-[3px] mt-1'>{item.docData?.speciality}</p>
                  <p className='text-xs text-slate-500 font-medium mt-2 bg-slate-100 w-fit px-3 py-1 rounded-full mx-auto md:mx-0'>
                    {slotDateFormat(item.slotDate)} | {item.slotTime}
                  </p>
                </div>

                <div className='flex flex-col gap-2 w-full md:w-auto'>
                  {/* --- PAYMENT AND CANCEL BUTTONS --- */}
                  {!item.cancelled && !item.isCompleted && !item.payment && (
                    <button
                      onClick={() => payStripe(item._id)}
                      className='px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase hover:bg-slate-800 transition-all'
                    >
                      Pay Online
                    </button>
                  )}

                  {item.payment && !item.isCompleted && (
                    <div className='flex items-center gap-2 px-6 py-3 bg-teal-50 text-teal-600 rounded-2xl font-black text-[10px] uppercase tracking-wider border border-teal-100'>
                      <RiShieldCheckLine size={16} />
                      Paid Securely
                    </div>
                  )}

                  {!item.cancelled && !item.isCompleted && (
                    <button
                      onClick={() => cancelAppointment(item._id)}
                      className='px-8 py-3 border border-slate-200 text-slate-400 rounded-2xl font-bold text-xs uppercase hover:bg-red-50 hover:text-red-500 transition-all'
                    >
                      Cancel
                    </button>
                  )}

                  {item.cancelled && <button className='px-8 py-3 border border-red-100 text-red-400 rounded-2xl font-bold text-xs uppercase cursor-not-allowed'>Cancelled</button>}
                  {item.isCompleted && <button className='px-8 py-3 border border-teal-100 text-teal-500 rounded-2xl font-bold text-xs uppercase cursor-not-allowed'>Visited</button>}
                </div>
              </div>

              {/* --- Health Tracker Section --- */}
              <AnimatePresence>
                {item.isCompleted && item.healthData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-[45px] p-8 md:p-12 text-white shadow-2xl overflow-hidden relative transition-all duration-700 ${isCritical ? 'bg-gradient-to-br from-red-950 via-slate-900 to-black' : 'bg-slate-900'}`}
                  >
                    {/* --- DOCTOR'S ALERT MESSAGE --- */}
                    {latestMessage && (
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className={`mb-12 p-6 rounded-[32px] border-l-8 flex gap-5 items-start ${isCritical ? 'bg-white/5 border-red-500 shadow-[20px_0_40px_rgba(0,0,0,0.3)]' : 'bg-white/5 border-teal-500'}`}
                      >
                        <div className={`${isCritical ? 'text-red-500' : 'text-teal-500'} mt-1`}>
                          <RiMessage3Line size={28} />
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-[3px] mb-2 ${isCritical ? 'text-red-400' : 'text-teal-400'}`}>Doctor's Instructions</p>
                          <p className='text-lg md:text-xl font-medium leading-relaxed text-slate-100 italic'>
                            "{latestMessage.content}"
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* --- VITALS DASHBOARD --- */}
                    <div className='mb-12'>
                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-6'>
                        <div className='bg-white/5 border border-white/10 p-6 rounded-[32px] hover:bg-white/10 transition-colors'>
                          <RiHeartPulseLine className='text-rose-400 mb-4' size={28} />
                          <p className='text-[10px] text-slate-400 font-bold uppercase tracking-widest'>Heart Rate</p>
                          <p className='text-3xl font-black mt-1'>{item.healthData.heartRate || '--'} <span className='text-xs text-slate-500 font-medium'>BPM</span></p>
                        </div>
                        <div className='bg-white/5 border border-white/10 p-6 rounded-[32px] hover:bg-white/10 transition-colors'>
                          <RiDashboardLine className='text-blue-400 mb-4' size={28} />
                          <p className='text-[10px] text-slate-400 font-bold uppercase tracking-widest'>Blood Pressure</p>
                          <p className='text-3xl font-black mt-1'>{item.healthData.bloodPressure || '--'}</p>
                        </div>
                        <div className='bg-white/5 border border-white/10 p-6 rounded-[32px] hover:bg-white/10 transition-colors'>
                          <RiTempHotLine className='text-orange-400 mb-4' size={28} />
                          <p className='text-[10px] text-slate-400 font-bold uppercase tracking-widest'>Temperature</p>
                          <p className='text-3xl font-black mt-1'>{item.healthData.temperature || '--'}<span className='text-xs text-slate-500 font-medium'>°C</span></p>
                        </div>
                      </div>
                    </div>

                    {/* --- MEDICATION TRACKER --- */}
                    <div className='space-y-8'>
                      <div className='flex items-center justify-between'>
                        <h3 className='text-[11px] font-black uppercase tracking-[4px] text-teal-400'>Current Medication Plan</h3>
                      </div>

                      <div className='grid gap-6'>
                        {item.healthData.prescribedMedicines?.map((med) => {
                          const { isEarly, hoursLeft } = getDoseStatus(med);
                          const isThisMedProcessing = processingMed === `${item._id}-${med.name}`;

                          return (
                            <div key={`${item._id}-${med.name}`} className={`bg-white/5 rounded-[35px] p-8 border transition-all duration-300 ${isEarly ? 'border-red-500/30' : 'border-white/10'}`}>
                              <div className='flex flex-col md:flex-row justify-between items-center gap-8'>
                                <div className='flex items-center gap-6'>
                                  <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-colors ${isEarly ? 'bg-red-500/20 text-red-400' : 'bg-teal-500/20 text-teal-400'}`}>
                                    <RiMedicineBottleLine size={32} />
                                  </div>
                                  <div>
                                    <p className='font-black text-2xl'>{med.name}</p>
                                    <div className='flex items-center gap-3 mt-1'>
                                      <p className='text-[10px] text-slate-400 uppercase font-black tracking-widest'>
                                        {med.remainingQuantity <= 0 ? 'Cycle Completed' : `${med.remainingQuantity} Doses Remaining`}
                                      </p>
                                      {isEarly && <span className='text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold uppercase'>Wait {hoursLeft}h</span>}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => logDose(item._id, med.name, med)}
                                  disabled={med.remainingQuantity <= 0 || !!processingMed}
                                  className={`w-full md:w-auto px-10 py-5 rounded-2xl font-black text-[12px] uppercase tracking-[2px] transition-all active:scale-95 shadow-xl ${isThisMedProcessing ? 'bg-slate-700 animate-pulse text-slate-400' :
                                    med.remainingQuantity <= 0 ? 'bg-white/10 text-slate-500 cursor-not-allowed' :
                                      isEarly ? 'bg-red-600 hover:bg-red-500 text-white' :
                                        'bg-teal-500 hover:bg-teal-400 text-slate-900'
                                    }`}
                                >
                                  {isThisMedProcessing ? 'Updating Record...' : med.remainingQuantity <= 0 ? 'All Doses Taken' : 'Confirm Dose'}
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