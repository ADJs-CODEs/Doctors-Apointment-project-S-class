import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext.js'
import { AppContext } from '../../context/AppContext.js'
import { assets } from '../../assets/assets/assets_admin/assets.js'
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
  RiDeleteBin6Line
} from "@remixicon/react"
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { toast } from 'sonner'

const DoctorAppointment: React.FC = () => {
  const { dToken, appointments, getAppointments, completeAppointment, cancelAppointment } = useContext(DoctorContext) as DoctorContextType
  const { calculateAge, slotDateFormat, currency, backendUrl } = useContext(AppContext) as AppContextType
  
  // State for loading feedback
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

  // FIXED: Added loading states and better error parsing
  const handleSendAlert = async () => {
    if (!alertForm.message.trim()) {
      return toast.error("Please enter alert content");
    }

    try {
      setIsSendingAlert(true);
      const { data } = await axios.post(`${backendUrl}/api/doctor/send-alert`,
        { appointmentId: selectedApptId, messageContent: alertForm.message, isCritical: alertForm.isCritical },
        { headers: { dToken } }
      );
      
      if (data.success) {
        toast.success("Alert & Email sent!");
        setShowAlertModal(false);
        setAlertForm({ message: '', isCritical: false });
        getAppointments();
      } else {
        toast.error(data.message || "Failed to send alert");
      }
    } catch (error: any) {
      // Extracts the specific error message from the backend if available
      const msg = error.response?.data?.message || error.message || "An error occurred";
      toast.error(msg);
    } finally {
      setIsSendingAlert(false); 
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
    if (dToken) getAppointments()
  }, [dToken])

  return (
    <div className='w-full max-w-6xl m-5 animate-reveal'>
      <div className='flex justify-between items-center mb-5'>
        <p className='text-2xl font-bold text-gray-800'>Patient Management</p>
        <div className='flex gap-2'>
          <span className='flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full'>● CRITICAL</span>
          <span className='flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full'>● ACTIVE</span>
        </div>
      </div>

      <div className='bg-white border rounded-2xl text-sm max-h-[80vh] overflow-y-scroll shadow-sm'>
        <div className='hidden sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-4 px-6 border-b bg-gray-50 text-gray-600 font-bold sticky top-0 z-20'>
          <p>#</p><p>Patient</p><p>Payment</p><p>Age</p><p>Date & Time</p><p>Fees</p><p className='text-center'>Action</p>
        </div>

        {sortedAppointments.map((item, index) => {
          const isCritical = item.patientStatus === 'Critical' || item.healthData?.prescribedMedicines?.some(m => m.overdoseAlert);

          return (
            <React.Fragment key={item._id || index}>
              <div
                onClick={() => item.isCompleted && setExpandedId(expandedId === item._id ? null : item._id)}
                className={`flex flex-wrap justify-between sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 items-center text-gray-500 py-4 px-6 border-b hover:bg-blue-50/30 transition-colors cursor-pointer 
                ${isCritical ? 'bg-red-50/50 border-l-4 border-l-red-500' : ''} 
                ${item.isCompleted ? 'opacity-75' : ''} 
                ${expandedId === item._id ? 'bg-blue-50/50' : ''}`}
              >
                <p className='max-sm:hidden font-medium text-xs'>{index + 1}</p>
                <div className='flex items-center gap-3'>
                  <div className='relative'>
                    <img className='w-10 h-10 rounded-full border bg-gray-100 object-cover' src={item.userData.image} alt="" />
                    {isCritical && <div className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse' />}
                  </div>
                  <div>
                    <p className={`font-bold ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>{item.userData.name}</p>
                    {item.isCompleted && (
                      <p className='text-[9px] text-teal-500 font-black flex items-center gap-1 uppercase tracking-tighter'>
                        <RiHistoryLine size={10} /> {expandedId === item._id ? 'Close Details' : 'View Adherence'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${item.payment ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                    {item.payment ? 'ONLINE' : 'CASH'}
                  </span>
                </div>

                <p className='max-sm:hidden font-medium'>{calculateAge(item.userData.dob)} Years</p>

                <div className='flex flex-col'>
                  <p className='font-semibold text-gray-700'>{slotDateFormat(item.slotDate)}</p>
                  <p className='text-xs opacity-70'>{item.slotTime}</p>
                </div>

                <p className='font-bold text-gray-800'>{currency}{item.amount}</p>

                <div className='flex justify-center'>
                  {item.cancelled ? <p className='text-red-400 text-[10px] font-black uppercase bg-red-50 px-3 py-1 rounded-full'>Cancelled</p> :
                    item.isCompleted ? <p className='text-emerald-500 text-[10px] font-black uppercase bg-emerald-50 px-3 py-1 rounded-full'>Completed</p> :
                      <div className='flex items-center gap-2'>
                        <button onClick={(e) => { e.stopPropagation(); cancelAppointment(item._id) }} className='hover:bg-red-50 p-2 rounded-full active:scale-90'>
                          <img className='w-6' src={assets.cancel_icon} alt="" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedApptId(item._id); setShowModal(true); }} className='hover:bg-emerald-50 p-2 rounded-full active:scale-90'>
                          <img className='w-6' src={assets.tick_icon} alt="" />
                        </button>
                      </div>}
                </div>
              </div>

              {/* Expanded Adherence View */}
              <AnimatePresence>
                {expandedId === item._id && item.healthData && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className='bg-slate-50 overflow-hidden border-b'>
                    <div className='p-6'>
                      <div className='flex justify-between items-center mb-6'>
                        <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400'>Clinical Monitoring</p>
                        <button
                          onClick={() => { setSelectedApptId(item._id); setShowAlertModal(true); }}
                          className='flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-600 transition-all'
                        >
                          <RiSendPlaneFill size={14} /> SEND PATIENT ALERT
                        </button>
                      </div>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                        <div className='grid grid-cols-3 gap-3'>
                          {[
                            { label: 'BP', value: item.healthData.bloodPressure, icon: <RiHeartPulseLine size={16} />, color: 'text-rose-500' },
                            { label: 'Pulse', value: item.healthData.heartRate, icon: <RiTimeLine size={16} />, color: 'text-blue-500' },
                            { label: 'Temp', value: item.healthData.temperature + '°C', icon: <RiTempHotLine size={16} />, color: 'text-teal-500' }
                          ].map((vital, vIdx) => (
                            <div key={vIdx} className='bg-white p-4 rounded-2xl border text-center shadow-sm'>
                              <div className={`${vital.color} flex justify-center mb-1`}>{vital.icon}</div>
                              <p className='text-sm font-black text-slate-800'>{vital.value || '--'}</p>
                              <p className='text-[8px] font-bold text-slate-400 uppercase'>{vital.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className='space-y-4'>
                          {item.healthData.prescribedMedicines?.map((med: any, mIdx: number) => {
                            const stats = getAdherenceStats(med);
                            return (
                              <div key={mIdx} className={`bg-white p-4 rounded-2xl border ${med.overdoseAlert ? 'border-red-500 bg-red-50/20' : 'border-slate-100'}`}>
                                <div className='flex justify-between items-center mb-2'>
                                  <p className='font-bold text-xs'>{med.name}</p>
                                  <p className='text-[11px] font-black text-teal-500'>{stats.rate}%</p>
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
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8">
              <div className='flex items-center gap-3 mb-6'>
                <div className='p-3 bg-red-100 text-red-600 rounded-2xl'><RiErrorWarningLine size={24} /></div>
                <div>
                  <h2 className='text-xl font-black text-slate-900'>Send Alert</h2>
                  <p className='text-[10px] font-bold text-slate-400 uppercase'>Direct Notification & Email</p>
                </div>
              </div>
              <textarea
                className='w-full p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-red-500 outline-none mb-4'
                rows={4}
                placeholder="Type your medical warning here..."
                value={alertForm.message}
                onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
              />
              <div className='flex items-center justify-between mb-8 px-2'>
                <label className='text-xs font-bold text-slate-600'>Mark as Critical Risk?</label>
                <input type="checkbox" className='w-5 h-5 accent-red-500' checked={alertForm.isCritical} onChange={(e) => setAlertForm({ ...alertForm, isCritical: e.target.checked })} />
              </div>
              <div className='flex gap-3'>
                <button 
                  disabled={isSendingAlert} 
                  onClick={() => setShowAlertModal(false)} 
                  className='flex-1 py-4 text-xs font-black uppercase text-slate-400'
                >
                  Cancel
                </button>
                <button 
                  disabled={isSendingAlert}
                  onClick={handleSendAlert} 
                  className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase transition-all active:scale-95 ${isSendingAlert ? 'bg-slate-300 text-slate-500' : 'bg-red-500 text-white shadow-lg shadow-red-100'}`}
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
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

              <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Patient Consultation</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add Vitals & Prescription</p>
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <RiCloseLine size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'BP', key: 'bloodPressure', icon: <RiHeartPulseLine size={16} />, placeholder: '120/80' },
                    { label: 'Pulse', key: 'heartRate', icon: <RiTimeLine size={16} />, placeholder: '72 bpm' },
                    { label: 'Temp', key: 'temperature', icon: <RiTempHotLine size={16} />, placeholder: '36.5' }
                  ].map((v) => (
                    <div key={v.key} className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase ml-2">{v.icon} {v.label}</label>
                      <input
                        type="text" className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder={v.placeholder} value={(vitals as any)[v.key]} onChange={(e) => setVitals({ ...vitals, [v.key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[1px]">Medication Plan</p>
                    <button onClick={() => setMedicines([...medicines, { name: '', frequencyType: 'daily', dosagePerDay: 1, totalQuantity: 7, status: 'Active', remainingQuantity: 7, lastTaken: '' }])} className="text-blue-600 font-bold text-xs flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all">
                      <RiAddLine size={16} /> Add Drug
                    </button>
                  </div>

                  <div className="space-y-4">
                    {medicines.map((med, index) => (
                      <div key={index} className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Drug Name</label>
                          <input className="w-full p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none" placeholder="Name" value={med.name} onChange={(e) => { const n = [...medicines]; if (n[index]) { n[index].name = e.target.value; setMedicines(n); } }} />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Frequency</label>
                          <select className="w-full p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none appearance-none" value={med.frequencyType} onChange={(e) => { const n = [...medicines]; if (n[index]) { n[index].frequencyType = e.target.value; setMedicines(n); } }}>
                            <option value="daily">Daily (Days)</option>
                            <option value="interval">Hourly (Interval)</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{med.frequencyType === 'daily' ? 'Every X Days' : 'Every X Hours'}</label>
                          <input
                            type="number"
                            className="w-full p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none"
                            value={med.dosagePerDay}
                            onChange={(e) => {
                              const n = [...medicines];
                              if (n[index]) {
                                n[index].dosagePerDay = Number(e.target.value);
                                setMedicines(n);
                              }
                            }}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Total Qty</label>
                          <input
                            type="number"
                            className="w-full p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none"
                            value={med.totalQuantity}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const n = [...medicines];
                              if (n[index]) {
                                n[index].totalQuantity = val;
                                n[index].remainingQuantity = val;
                                setMedicines(n);
                              }
                            }}
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-center pb-1">
                          <button onClick={() => setMedicines(medicines.filter((_, i) => i !== index))} className="p-2 text-red-300 hover:text-red-500 transition-colors"><RiDeleteBin6Line size={20} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Clinical Notes</label>
                  <textarea rows={3} className="w-full p-5 bg-slate-50 rounded-[24px] border-none outline-none text-sm" placeholder="Additional instructions..." value={vitals.notes} onChange={(e) => setVitals({ ...vitals, notes: e.target.value })} />
                </div>
              </div>

              <div className="p-8 border-t bg-slate-50/50 flex gap-4">
                <button onClick={resetForm} className="flex-1 py-4 text-xs font-black uppercase text-slate-400">Discard</button>
                <button
                  onClick={async () => {
                    const success = await completeAppointment(selectedApptId, { ...vitals, prescribedMedicines: medicines });
                    if (success) {
                      toast.success("Consultation Completed");
                      resetForm();
                      getAppointments();
                    }
                  }}
                  className="flex-[2] py-4 bg-emerald-500 text-white rounded-[20px] text-xs font-black uppercase shadow-lg shadow-emerald-100"
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

export default DoctorAppointment