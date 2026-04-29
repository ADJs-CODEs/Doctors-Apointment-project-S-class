import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext.js'
import { AppContext } from '../../context/AppContext.js'
import type { DoctorContextType, AppContextType } from '../../types/index.js'
import {
  RiCloseLine,
  RiAddLine,
  RiHeartPulseLine,
  RiTempHotLine,
  RiMedicineBottleLine,
  RiTimeLine,
  RiHistoryLine,
  RiSendPlaneFill,
  RiErrorWarningLine,
  RiDeleteBin6Line,
  RiCheckboxCircleFill,
  RiCloseCircleFill
} from "@remixicon/react"
import { motion, AnimatePresence } from 'framer-motion'
import axiosInstance from "../../utils/axiosInstance.js"
import { toast } from 'sonner'
import { API_PATHS } from '../../utils/apiPath.js'

const DoctorAppointment: React.FC = () => {
  const { dToken, appointments, getAppointments, completeAppointment, cancelAppointment } = useContext(DoctorContext) as DoctorContextType
  const { calculateAge, slotDateFormat, currency, backendUrl, setProgress } = useContext(AppContext) as AppContextType

  const [isSendingAlert, setIsSendingAlert] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [selectedApptId, setSelectedApptId] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [alertForm, setAlertForm] = useState({ message: '', isCritical: false })
  const [vitals, setVitals] = useState({ bloodPressure: '', heartRate: '', temperature: '', notes: '' })

  const [medicines, setMedicines] = useState([{
    name: '',
    frequencyType: 'daily',
    dosagePerDay: 1,
    totalQuantity: 7,
    status: 'Active',
    remainingQuantity: 7,
    lastTaken: ''
  }])

  const sortedAppointments = appointments ? [...appointments].sort((a, b) => {
    const aCritical = a.patientStatus === 'Critical' || a.healthData?.prescribedMedicines?.some(m => m.overdoseAlert);
    const bCritical = b.patientStatus === 'Critical' || b.healthData?.prescribedMedicines?.some(m => m.overdoseAlert);
    if (aCritical && !bCritical) return -1;
    if (!aCritical && bCritical) return 1;
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return 0;
  }) : [];

  const handleSendAlert = async () => {
    if (!alertForm.message.trim()) {
      return toast.error("Please enter alert content");
    }

    try {
      setIsSendingAlert(true);
      setProgress(40);

      const { data } = await axiosInstance.post(API_PATHS.DOCTOR.SEND_ALERT,
        {
          appointmentId: selectedApptId,
          messageContent: alertForm.message,
          isCritical: alertForm.isCritical
        }
      );

      if (data.success) {
        toast.success("Alert processed successfully!");
        setShowAlertModal(false);
        setAlertForm({ message: '', isCritical: false });
        await getAppointments();
      } else {
        toast.error(data.message || "Failed to send alert");
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.success("Alert saved (Email may take a moment)");
        setShowAlertModal(false);
        setAlertForm({ message: '', isCritical: false });
        await getAppointments();
      } else {
        const msg = error.response?.data?.message || error.message || "An error occurred";
        toast.error(msg);
      }
    } finally {
      setIsSendingAlert(false);
      setProgress(100);
    }
  }

  const resetForm = () => {
    setVitals({ bloodPressure: '', heartRate: '', temperature: '', notes: '' })
    setMedicines([{ name: '', frequencyType: 'daily', dosagePerDay: 1, totalQuantity: 7, status: 'Active', remainingQuantity: 7, lastTaken: '' }])
    setShowModal(false)
    setSelectedApptId('')
  }

  const getAdherenceStats = (med: any) => {
    if (!med.totalQuantity) return { rate: 0 };
    const actual = med.totalQuantity - med.remainingQuantity;
    const rate = Math.min(100, Math.round((actual / med.totalQuantity) * 100));
    return { rate };
  }

  useEffect(() => {
    if (dToken) {
      setProgress(30);
      getAppointments().finally(() => setProgress(100));
    }
  }, [dToken])

  return (
    <div className='w-full max-w-6xl m-2 sm:m-5 animate-reveal'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4'>
        <p className='text-xl sm:text-2xl font-bold text-gray-800'>Patient Management</p>
        <div className='flex gap-2'>
          <span className='flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full'>● CRITICAL</span>
          <span className='flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full'>● ACTIVE</span>
        </div>
      </div>

      <div className='bg-white border rounded-2xl text-sm max-h-[80vh] overflow-y-auto shadow-sm custom-scrollbar'>
        <div className='hidden lg:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-4 px-6 border-b bg-gray-50 text-gray-600 font-bold sticky top-0 z-20'>
          <p>#</p><p>Patient</p><p>Payment</p><p>Age</p><p>Date & Time</p><p>Fees</p><p className='text-center'>Action</p>
        </div>

        {sortedAppointments.map((item, index) => {
          const isCritical = item.patientStatus === 'Critical' || item.healthData?.prescribedMedicines?.some(m => m.overdoseAlert);

          return (
            <React.Fragment key={item._id || index}>
              <div
                onClick={() => item.isCompleted && setExpandedId(expandedId === item._id ? null : item._id)}
                className={`flex flex-col lg:grid lg:grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-3 lg:gap-1 items-start lg:items-center text-gray-500 py-5 lg:py-4 px-4 sm:px-6 border-b hover:bg-blue-50/30 transition-all cursor-pointer relative
                ${isCritical ? 'bg-red-50/50 border-l-4 border-l-red-500' : ''} 
                ${item.isCompleted ? 'opacity-90' : ''} 
                ${expandedId === item._id ? 'bg-blue-50/50' : ''}`}
              >
                <p className='hidden lg:block font-medium text-xs'>{index + 1}</p>

                <div className='flex items-center gap-3 w-full lg:w-auto'>
                  <div className='relative'>
                    <img className='w-12 h-12 lg:w-10 lg:h-10 rounded-full border bg-gray-100 object-cover' src={item.userData.image} alt="" />
                    {isCritical && <div className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse' />}
                  </div>
                  <div className='flex-1'>
                    <p className={`font-bold text-base lg:text-sm ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>{item.userData.name}</p>
                    <p className='lg:hidden text-xs text-gray-500'>{calculateAge(item.userData.dob)} Years • {item.payment ? 'Online' : 'Cash'}</p>
                    {item.isCompleted && (
                      <p className='text-[9px] text-teal-600 font-black flex items-center gap-1 uppercase tracking-tighter mt-1'>
                        <RiHistoryLine size={10} /> {expandedId === item._id ? 'Close Details' : 'View Adherence'}
                      </p>
                    )}
                  </div>
                  <div className='lg:hidden font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg'>{currency}{item.amount}</div>
                </div>

                <div className='hidden lg:block'>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${item.payment ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                    {item.payment ? 'ONLINE' : 'CASH'}
                  </span>
                </div>

                <p className='hidden lg:block font-medium'>{calculateAge(item.userData.dob)} Years</p>

                <div className='flex flex-row lg:flex-col items-center lg:items-start gap-2 lg:gap-0 w-full lg:w-auto border-t lg:border-none pt-2 lg:pt-0'>
                  <p className='font-semibold text-gray-700 text-xs sm:text-sm'>{slotDateFormat(item.slotDate)}</p>
                  <span className='lg:hidden text-gray-300'>|</span>
                  <p className='text-xs opacity-70'>{item.slotTime}</p>
                </div>

                <p className='hidden lg:block font-bold text-gray-800'>{currency}{item.amount}</p>

                <div className='flex lg:justify-center w-full lg:w-auto mt-2 lg:mt-0'>
                  {item.cancelled ? <p className='text-red-400 text-[10px] font-black uppercase bg-red-50 px-3 py-1 rounded-full'>Cancelled</p> :
                    item.isCompleted ? <p className='text-emerald-500 text-[10px] font-black uppercase bg-emerald-50 px-3 py-1 rounded-full'>Completed</p> :
                      <div className='flex items-center gap-4 lg:gap-2 w-full lg:w-auto'>
                        {/* Cancel Button */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setProgress(40);
                            await cancelAppointment(item._id);
                            setProgress(100);
                          }}
                          className='flex-1 lg:flex-none flex justify-center items-center bg-red-50 hover:bg-red-100 border border-red-100 p-2.5 lg:p-2 rounded-xl lg:rounded-full active:scale-90 transition-all group'
                          title="Cancel Appointment"
                        >
                          <RiCloseCircleFill className="text-red-500 group-hover:text-red-600 size-6 lg:size-5" />
                          <span className='lg:hidden ml-2 font-bold text-red-600 text-xs'>Cancel</span>
                        </button>

                        {/* Complete/Consult Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApptId(item._id);
                            setShowModal(true);
                          }}
                          className='flex-1 lg:flex-none flex justify-center items-center bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 p-2.5 lg:p-2 rounded-xl lg:rounded-full active:scale-90 transition-all group'
                          title="Mark Complete"
                        >
                          <RiCheckboxCircleFill className="text-emerald-500 group-hover:text-emerald-600 size-6 lg:size-5" />
                          <span className='lg:hidden ml-2 font-bold text-emerald-600 text-xs'>Consult</span>
                        </button>
                      </div>}
                </div>
              </div>

              {/* Expanded Adherence View */}
              <AnimatePresence>
                {expandedId === item._id && item.healthData && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className='bg-slate-50 overflow-hidden border-b'>
                    <div className='p-4 sm:p-6'>
                      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4'>
                        <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400'>Clinical Monitoring</p>
                        <button
                          onClick={() => { setSelectedApptId(item._id); setShowAlertModal(true); }}
                          className='w-full sm:w-auto flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-3 sm:py-2 rounded-xl text-[10px] font-black hover:bg-red-600 active:scale-95 transition-all'
                        >
                          <RiSendPlaneFill size={14} /> SEND PATIENT ALERT
                        </button>
                      </div>
                      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8'>
                        <div className='grid grid-cols-3 gap-2 sm:gap-3'>
                          {[
                            { label: 'BP', value: item.healthData.bloodPressure, icon: <RiHeartPulseLine size={16} />, color: 'text-rose-500' },
                            { label: 'Pulse', value: item.healthData.heartRate, icon: <RiTimeLine size={16} />, color: 'text-blue-500' },
                            { label: 'Temp', value: item.healthData.temperature + '°C', icon: <RiTempHotLine size={16} />, color: 'text-teal-500' }
                          ].map((vital, vIdx) => (
                            <div key={vIdx} className='bg-white p-3 sm:p-4 rounded-2xl border text-center shadow-sm'>
                              <div className={`${vital.color} flex justify-center mb-1`}>{vital.icon}</div>
                              <p className='text-xs sm:text-sm font-black text-slate-800'>{vital.value || '--'}</p>
                              <p className='text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase'>{vital.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className='space-y-3 sm:space-y-4'>
                          {item.healthData.prescribedMedicines?.map((med: any, mIdx: number) => {
                            const stats = getAdherenceStats(med);
                            return (
                              <div key={mIdx} className={`bg-white p-3 sm:p-4 rounded-2xl border ${med.overdoseAlert ? 'border-red-500 bg-red-50/20' : 'border-slate-100'}`}>
                                <div className='flex justify-between items-center mb-2'>
                                  <p className='font-bold text-[11px] sm:text-xs'>{med.name}</p>
                                  <p className='text-[10px] sm:text-[11px] font-black text-teal-500'>{stats.rate}%</p>
                                </div>
                                <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
                                  <div className={`h-full ${med.overdoseAlert ? 'bg-red-500' : 'bg-teal-500'}`} style={{ width: `${stats.rate}%` }}></div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          );
        })}
      </div>

      {/* --- ALERT MODAL --- */}
      <AnimatePresence>
        {showAlertModal && (
          <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 sm:p-8">
              <div className='flex items-center gap-3 mb-6'>
                <div className='p-3 bg-red-100 text-red-600 rounded-2xl'><RiErrorWarningLine size={24} /></div>
                <div>
                  <h2 className='text-lg sm:text-xl font-black text-slate-900'>Send Alert</h2>
                  <p className='text-[10px] font-bold text-slate-400 uppercase'>Direct Notification & Email</p>
                </div>
              </div>
              <textarea
                className='w-full p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-red-500 outline-none mb-4 font-medium'
                rows={4}
                placeholder="Type your medical warning here..."
                value={alertForm.message}
                onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
              />
              <div className='flex items-center justify-between mb-8 px-2'>
                <label className='text-xs font-bold text-slate-600'>Mark as Critical Risk?</label>
                <input type="checkbox" className='w-6 h-6 sm:w-5 sm:h-5 accent-red-500 rounded-lg cursor-pointer' checked={alertForm.isCritical} onChange={(e) => setAlertForm({ ...alertForm, isCritical: e.target.checked })} />
              </div>
              <div className='flex flex-col sm:flex-row gap-3'>
                <button
                  disabled={isSendingAlert}
                  onClick={() => setShowAlertModal(false)}
                  className='order-2 sm:order-1 flex-1 py-4 text-xs font-black uppercase text-slate-400 active:scale-95 transition-all'
                >
                  Cancel
                </button>
                <button
                  disabled={isSendingAlert}
                  onClick={handleSendAlert}
                  className={`order-1 sm:order-2 flex-1 py-4 rounded-2xl text-xs font-black uppercase transition-all active:scale-95 ${isSendingAlert ? 'bg-slate-300 text-slate-500' : 'bg-red-500 text-white shadow-lg shadow-red-100'}`}
                >
                  {isSendingAlert ? 'Sending...' : 'Send Alert'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PRESCRIBE MODAL --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} className="bg-white w-full max-w-3xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

              <div className="p-6 sm:p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">Consultation</h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add Vitals & Prescription</p>
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full active:scale-90 transition-all">
                  <RiCloseLine size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto space-y-8 sm:space-y-10 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {[
                    { label: 'BP', key: 'bloodPressure', icon: <RiHeartPulseLine size={16} />, placeholder: '120/80' },
                    { label: 'Pulse', key: 'heartRate', icon: <RiTimeLine size={16} />, placeholder: '72 bpm' },
                    { label: 'Temp', key: 'temperature', icon: <RiTempHotLine size={16} />, placeholder: '36.5' }
                  ].map((v) => (
                    <div key={v.key} className="space-y-2">
                      <label className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase ml-2">{v.icon} {v.label}</label>
                      <input
                        type="text" className="w-full p-3 sm:p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700"
                        placeholder={v.placeholder} value={(vitals as any)[v.key]} onChange={(e) => setVitals({ ...vitals, [v.key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[1px]">Medication Plan</p>
                    <button onClick={() => setMedicines([...medicines, { name: '', frequencyType: 'daily', dosagePerDay: 1, totalQuantity: 7, status: 'Active', remainingQuantity: 7, lastTaken: '' }])} className="text-blue-600 font-bold text-[10px] sm:text-xs flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                      <RiAddLine size={16} /> Add Drug
                    </button>
                  </div>

                  <div className="space-y-4">
                    {medicines.map((med, index) => (
                      <div key={index} className="p-4 sm:p-5 bg-slate-50 rounded-[24px] border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase ml-1">Drug Name</label>
                          <input className="w-full p-2.5 sm:p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none font-bold" placeholder="Name" value={med.name} onChange={(e) => { const n = [...medicines]; if (n[index]) { n[index].name = e.target.value; setMedicines(n); } }} />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase ml-1">Frequency</label>
                          <select className="w-full p-2.5 sm:p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none font-bold appearance-none" value={med.frequencyType} onChange={(e) => { const n = [...medicines]; if (n[index]) { n[index].frequencyType = e.target.value; setMedicines(n); } }}>
                            <option value="daily">Daily (Days)</option>
                            <option value="interval">Hourly (Interval)</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase ml-1">{med.frequencyType === 'daily' ? 'X Days' : 'X Hours'}</label>
                          <input type="number" className="w-full p-2.5 sm:p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none font-bold" value={med.dosagePerDay} onChange={(e) => { const n = [...medicines]; if (n[index]) { n[index].dosagePerDay = Number(e.target.value); setMedicines(n); } }} />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase ml-1">Total Qty</label>
                          <input type="number" className="w-full p-2.5 sm:p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none font-bold" value={med.totalQuantity} onChange={(e) => { const val = Number(e.target.value); const n = [...medicines]; if (n[index]) { n[index].totalQuantity = val; n[index].remainingQuantity = val; setMedicines(n); } }} />
                        </div>
                        <div className="md:col-span-1 flex justify-center md:pb-1">
                          <button onClick={() => setMedicines(medicines.filter((_, i) => i !== index))} className="p-2 text-red-300 hover:text-red-500 active:scale-90 transition-all"><RiDeleteBin6Line size={20} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase ml-2">Clinical Notes</label>
                  <textarea rows={3} className="w-full p-4 sm:p-5 bg-slate-50 rounded-[20px] sm:rounded-[24px] border-none outline-none text-sm font-medium" placeholder="Additional instructions..." value={vitals.notes} onChange={(e) => setVitals({ ...vitals, notes: e.target.value })} />
                </div>
              </div>

              <div className="p-6 sm:p-8 border-t bg-slate-50/50 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button onClick={resetForm} className="order-2 sm:order-1 flex-1 py-3 sm:py-4 text-[10px] sm:text-xs font-black uppercase text-slate-400 active:scale-95 transition-all">Discard</button>
                <button
                  onClick={async () => {
                    setProgress(40);
                    const success = await completeAppointment(selectedApptId, { ...vitals, prescribedMedicines: medicines });
                    if (success) {
                      setProgress(80);
                      toast.success("Consultation Completed");
                      resetForm();
                      await getAppointments();
                      setProgress(100);
                    } else {
                      setProgress(100);
                    }
                  }}
                  className="order-1 sm:order-2 flex-[2] py-4 bg-emerald-500 text-white rounded-xl sm:rounded-[20px] text-[10px] sm:text-xs font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  Complete & Prescribe
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DoctorAppointment;