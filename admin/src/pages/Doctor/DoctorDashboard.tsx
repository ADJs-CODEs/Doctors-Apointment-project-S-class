import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext.js'
import { AppContext } from '../../context/AppContext.js'
import { assets } from '../../assets/assets/assets_admin/assets.js'
import type { DoctorContextType, AppContextType, Appointment } from '../../types/index.js'
import {
  RiErrorWarningFill,
  RiCloseLine,
  RiAddLine,
  RiHeartPulseLine,
  RiTimeLine,
  RiTempHotLine,
  RiDeleteBin6Line
} from "@remixicon/react"
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const DoctorDashboard: React.FC = () => {
  const { dToken, dashData, getDashData, completeAppointment, cancelAppointment } = useContext(DoctorContext) as DoctorContextType
  const { currency, slotDateFormat } = useContext(AppContext) as AppContextType

  // --- Modal States ---
  const [showModal, setShowModal] = useState(false)
  const [selectedApptId, setSelectedApptId] = useState('')
  const [vitals, setVitals] = useState({ bloodPressure: '', heartRate: '', temperature: '', notes: '' })
  const [medicines, setMedicines] = useState([{
    name: '',
    frequencyType: 'daily',
    frequencyValue: 1,
    totalQuantity: 7,
    status: 'Active',
    remainingQuantity: 7,
    lastTaken: ''
  }])

  useEffect(() => {
    if (dToken) {
      getDashData()
    }
  }, [dToken, getDashData])

  const resetForm = () => {
    setVitals({ bloodPressure: '', heartRate: '', temperature: '', notes: '' })
    setMedicines([{ name: '', frequencyType: 'daily', frequencyValue: 1, totalQuantity: 7, status: 'Active', remainingQuantity: 7, lastTaken: '' }])
    setShowModal(false)
    setSelectedApptId('')
  }

  if (!dashData) return null;

  const latestBookings = dashData.latestAppointments || dashData.latestAppointment || [];

  return (
    <div className='m-5 space-y-6'>
      {/* --- Stats Grid --- */}
      <div className='flex flex-wrap gap-4'>
        <div className='flex-1 min-w-[240px] bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4'>
          <div className='p-3 bg-emerald-50 rounded-xl'><img className='w-8' src={assets.earning_icon} alt="" /></div>
          <div>
            <p className='text-2xl font-bold text-gray-800'>{currency} {dashData.earnings}</p>
            <p className='text-sm text-gray-400 font-medium uppercase tracking-wider'>Total Earnings</p>
          </div>
        </div>

        <div className='flex-1 min-w-[240px] bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4'>
          <div className='p-3 bg-blue-50 rounded-xl'><img className='w-8' src={assets.appointments_icon} alt="" /></div>
          <div>
            <p className='text-2xl font-bold text-gray-800'>{dashData.appointments}</p>
            <p className='text-sm text-gray-400 font-medium uppercase tracking-wider'>Total Bookings</p>
          </div>
        </div>

        <div className='flex-1 min-w-[240px] bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4'>
          <div className='p-3 bg-purple-50 rounded-xl'><img className='w-8' src={assets.patients_icon} alt="" /></div>
          <div>
            <p className='text-2xl font-bold text-gray-800'>{dashData.patients}</p>
            <p className='text-sm text-gray-400 font-medium uppercase tracking-wider'>Unique Patients</p>
          </div>
        </div>
      </div>

      {/* --- Latest Bookings Table --- */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between px-6 py-5 border-b border-gray-50 bg-gray-50/50'>
          <div className='flex items-center gap-3'>
            <img className='w-5' src={assets.list_icon} alt="" />
            <p className='font-bold text-gray-700'>Latest Bookings</p>
          </div>
          <div className='flex items-center gap-2'>
            <span className='w-2 h-2 bg-red-500 rounded-full animate-pulse'></span>
            <p className='text-[10px] font-bold text-red-500 uppercase'>Urgent Attention Required</p>
          </div>
        </div>

        <div className='divide-y divide-gray-50'>
          {latestBookings.length > 0 ? (
            latestBookings.map((item: Appointment, index: number) => {
              const isUrgent = item.patientStatus === 'Critical' ||
                item.healthData?.prescribedMedicines?.some(m => m.overdoseAlert);

              return (
                <div className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 transition-colors ${isUrgent ? 'bg-red-50/40' : ''}`} key={index}>
                  <div className='flex items-center gap-3'>
                    <div className='relative'>
                      <img className='rounded-full w-12 h-12 object-cover border-2 border-white shadow-sm' src={item.userData.image} alt="" />
                      {isUrgent && (
                        <div className='absolute -top-1 -right-1 text-red-500 bg-white rounded-full'>
                          <RiErrorWarningFill size={18} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold ${isUrgent ? 'text-red-700' : 'text-gray-900'}`}>{item.userData.name}</p>
                      <p className='text-xs text-gray-500'>{slotDateFormat(item.slotDate)} at {item.slotTime}</p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3'>
                    {item.cancelled ? (
                      <span className='px-3 py-1 rounded-full bg-red-50 text-red-500 text-xs font-bold uppercase'>Cancelled</span>
                    ) : item.isCompleted ? (
                      <span className='px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold uppercase'>Completed</span>
                    ) : (
                      <div className='flex items-center gap-1'>
                        {isUrgent && <span className='text-[9px] font-black text-red-500 mr-2 animate-pulse'>OVERDOSE RISK</span>}
                        <button onClick={() => cancelAppointment(item._id)} className='p-2 hover:bg-red-50 rounded-full transition-colors'>
                          <img className='w-7 opacity-70 hover:opacity-100' src={assets.cancel_icon} alt="Cancel" />
                        </button>
                        {/* Open Modal instead of direct complete */}
                        <button onClick={() => { setSelectedApptId(item._id); setShowModal(true); }} className='p-2 hover:bg-emerald-50 rounded-full transition-colors'>
                          <img className='w-7 opacity-70 hover:opacity-100' src={assets.tick_icon} alt="Complete" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className='p-10 text-center text-gray-400 font-medium'>No recent bookings to show.</div>
          )}
        </div>
      </div>

      {/* --- CONSULTATION POPUP (Matched Design) --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

              <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Dashboard Consultation</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Vitals & Medication</p>
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <RiCloseLine size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-10">
                {/* Vitals */}
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

                {/* Medication */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[1px]">Medication Plan</p>
                    <button onClick={() => setMedicines([...medicines, { name: '', frequencyType: 'daily', frequencyValue: 1, totalQuantity: 7, status: 'Active', remainingQuantity: 7, lastTaken: '' }])} className="text-blue-600 font-bold text-xs flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg">
                      <RiAddLine size={16} /> Add Drug
                    </button>
                  </div>

                  <div className="space-y-4">
                    {medicines.map((med, index) => (
                      <div key={index} className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Drug Name</label>
                          <input className="w-full p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none" placeholder="Name" value={med.name} onChange={(e) => { const n = [...medicines]; n[index].name = e.target.value; setMedicines(n); }} />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Frequency</label>
                          <select className="w-full p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none" value={med.frequencyType} onChange={(e) => { const n = [...medicines]; n[index].frequencyType = e.target.value; setMedicines(n); }}>
                            <option value="daily">Daily (Days)</option>
                            <option value="interval">Hourly (Interval)</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{med.frequencyType === 'daily' ? 'Days' : 'Hours'}</label>
                          <input type="number" className="w-full p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none" value={med.frequencyValue} onChange={(e) => { const n = [...medicines]; n[index].frequencyValue = Number(e.target.value); setMedicines(n); }} />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Qty</label>
                          <input type="number" className="w-full p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none" value={med.totalQuantity} onChange={(e) => { const n = [...medicines]; n[index].totalQuantity = Number(e.target.value); n[index].remainingQuantity = Number(e.target.value); setMedicines(n); }} />
                        </div>
                        <div className="md:col-span-1 flex justify-center pb-1">
                          <button onClick={() => setMedicines(medicines.filter((_, i) => i !== index))} className="p-2 text-red-300 hover:text-red-500"><RiDeleteBin6Line size={20} /></button>
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
                <button onClick={resetForm} className="flex-1 py-4 text-xs font-black uppercase text-slate-400">Cancel</button>
                <button
                  onClick={async () => {
                    const success = await completeAppointment(selectedApptId, { ...vitals, prescribedMedicines: medicines });
                    if (success) {
                      toast.success("Appointment Processed");
                      resetForm();
                      getDashData();
                    }
                  }}
                  className="flex-[2] py-4 bg-emerald-500 text-white rounded-[20px] text-xs font-black uppercase shadow-lg"
                >
                  Finalize Booking
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DoctorDashboard