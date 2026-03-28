import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext.js'
import { AppContext } from '../../context/AppContext.js'
import {
  RiCalendarEventLine,
  RiCloseCircleLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiMedicineBottleLine,
  RiArrowDownSLine,
  RiInformationLine
} from '@remixicon/react'
import type { AdminContextType, AppContextType, Appointment } from '../../types/index.js'
import { motion, AnimatePresence } from 'framer-motion'

const AllAppointments: React.FC = () => {
  const { aToken, appointments, getAllAppointments, cancelAppointment } = useContext(AdminContext) as AdminContextType
  const { calculateAge, slotDateFormat, currency, setProgress } = useContext(AppContext) as AppContextType

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (aToken) {
      getAllAppointments()
    }
  }, [aToken, getAllAppointments])

  // Progress bar wrapper for cancellation
  const handleCancel = async (id: string) => {
    setProgress(40)
    await cancelAppointment(id)
    setProgress(100)
  }

  return (
    <div className='p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal'>
      <div className='max-w-7xl mx-auto'>

        {/* --- Header Section --- */}
        <div className='mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-2.5 sm:p-3 bg-slate-900 rounded-xl sm:rounded-2xl text-teal-400 shadow-lg'>
                <RiCalendarEventLine size={20} className='sm:w-6 sm:h-6' />
              </div>
              <h1 className='text-xl sm:text-3xl font-black text-slate-900 tracking-tight'>
                Appointment <span className='text-teal-500 font-serif italic normal-case'>Registry</span>
              </h1>
            </div>
            <p className='text-slate-500 text-xs sm:text-sm font-medium ml-12 sm:ml-14'>Accountability log: Track clinical notes.</p>
          </div>

          <div className='bg-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-portal border border-slate-100 flex items-center justify-between md:justify-start gap-4'>
            <p className='text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400'>Total Logs</p>
            <span className='text-lg sm:text-xl font-black text-slate-900'>{appointments.length}</span>
          </div>
        </div>

        {/* --- Table Container --- */}
        <div className='bg-white rounded-[32px] sm:rounded-[40px] shadow-portal border border-slate-100 overflow-hidden'>
          <div className='max-h-[75vh] overflow-y-auto hide-scrollbar'>

            {/* Desktop Table Header - Stays hidden on small screens */}
            <div className='hidden lg:grid grid-cols-[0.5fr_2.5fr_0.8fr_2fr_2fr_1fr_1fr] items-center py-6 px-10 bg-slate-900 text-white sticky top-0 z-10'>
              <p className='text-[10px] font-black uppercase tracking-widest opacity-50'>#</p>
              <p className='text-[10px] font-black uppercase tracking-widest opacity-50'>Patient Profile</p>
              <p className='text-[10px] font-black uppercase tracking-widest opacity-50'>Age</p>
              <p className='text-[10px] font-black uppercase tracking-widest opacity-50'>Schedule</p>
              <p className='text-[10px] font-black uppercase tracking-widest opacity-50'>Practitioner</p>
              <p className='text-[10px] font-black uppercase tracking-widest opacity-50'>Billing</p>
              <p className='text-[10px] font-black uppercase tracking-widest opacity-50 text-center'>Status</p>
            </div>

            {/* Table Body */}
            <div className='divide-y divide-slate-50'>
              {appointments.map((item: Appointment, index: number) => (
                <div key={item._id} className='flex flex-col'>
                  <div
                    className={`flex flex-col lg:grid lg:grid-cols-[0.5fr_2.5fr_0.8fr_2fr_2fr_1fr_1fr] items-start lg:items-center py-6 px-5 sm:px-6 lg:px-10 hover:bg-slate-50/80 transition-all duration-300 group ${expandedId === item._id ? 'bg-slate-50' : ''}`}
                  >
                    <p className='hidden lg:block text-xs font-black text-slate-300'>{(index + 1).toString().padStart(2, '0')}</p>

                    {/* Patient Profile */}
                    <div className='flex items-center gap-4 w-full lg:w-auto mb-4 lg:mb-0'>
                      <img className='w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md' src={item.userData.image.replace('/upload/', '/upload/f_jpg,q_auto:best,w_200,h_200,c_fill/')} alt="" />
                      <div>
                        <p className='text-sm font-black text-slate-900'>{item.userData.name}</p>
                        <p className='lg:hidden text-[10px] font-bold text-slate-500'>{calculateAge(item.userData.dob)} yrs</p>
                      </div>
                    </div>

                    <p className='hidden lg:block text-sm font-bold text-slate-600'>{calculateAge(item.userData.dob)} yrs</p>

                    {/* Schedule */}
                    <div className='flex flex-col gap-1 w-full lg:w-auto mb-4 lg:mb-0'>
                      <div className='flex items-center gap-2 text-slate-900 font-black text-xs'>
                        <RiTimeLine size={14} className='text-teal-500' />
                        {slotDateFormat(item.slotDate)}
                      </div>
                      <p className='text-[10px] font-bold text-slate-400 ml-5 uppercase tracking-wider'>{item.slotTime}</p>
                    </div>

                    {/* Practitioner */}
                    <div className='flex items-center gap-3 w-full lg:w-auto mb-4 lg:mb-0'>
                      <img className='w-8 h-8 rounded-full bg-slate-100 object-cover border border-slate-200' src={item.docData.image} alt="" />
                      <div>
                        <p className='text-xs font-black text-slate-700'>{item.docData.name}</p>
                        <p className='text-[9px] text-teal-600 font-bold uppercase tracking-tighter'>{item.docData.speciality}</p>
                      </div>
                    </div>

                    {/* Billing */}
                    <div className='flex items-center justify-between w-full lg:w-auto mb-4 lg:mb-0'>
                      <span className='lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest'>Billing:</span>
                      <p className='text-sm font-black text-slate-900'>{currency}{item.amount}</p>
                    </div>

                    {/* Status Action */}
                    <div className='flex items-center justify-center lg:justify-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t border-slate-50 lg:border-none'>
                      {item.cancelled ? (
                        <div className='flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-500 rounded-full border border-red-100 w-full lg:w-auto justify-center'>
                          <RiCloseCircleLine size={14} />
                          <span className='text-[10px] font-black uppercase tracking-widest'>Cancelled</span>
                        </div>
                      ) : item.isCompleted ? (
                        <div
                          onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                          className='flex items-center gap-1.5 px-4 py-2 bg-teal-50 text-teal-600 rounded-xl sm:rounded-full border border-teal-100 cursor-pointer hover:bg-teal-500 hover:text-white transition-all group w-full lg:w-auto justify-center active:scale-95'
                        >
                          <RiCheckboxCircleLine size={14} />
                          <span className='text-[10px] font-black uppercase tracking-widest'>View Rx</span>
                          <RiArrowDownSLine size={14} className={`transition-transform duration-300 ${expandedId === item._id ? 'rotate-180' : ''}`} />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCancel(item._id)}
                          className='flex items-center justify-center gap-2 lg:p-3 w-full lg:w-auto py-2 bg-slate-50 lg:bg-transparent text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl lg:rounded-2xl transition-all active:scale-95'
                        >
                          <RiCloseCircleLine size={24} />
                          <span className='lg:hidden text-[10px] font-black uppercase tracking-widest'>Cancel Appointment</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* --- Accountable Prescription Dropdown --- */}
                  <AnimatePresence>
                    {expandedId === item._id && item.healthData && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className='bg-slate-900 border-t border-white/5 overflow-hidden'
                      >
                        <div className='p-6 sm:p-8'>
                          <div className='flex items-center gap-2 mb-6'>
                            <RiInformationLine size={18} className='text-teal-400' />
                            <p className='text-[10px] font-black text-teal-400 uppercase tracking-[3px]'>Practitioner Clinical Notes</p>
                          </div>

                          <div className='space-y-4'>
                            {item.healthData.prescribedMedicines?.map((med, idx) => (
                              <div key={idx} className='bg-white/5 border border-white/10 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 hover:border-teal-500/30 transition-all'>
                                <div className='flex items-center gap-4 shrink-0'>
                                  <div className='p-2.5 bg-teal-500/10 rounded-xl'>
                                    <RiMedicineBottleLine size={20} className='text-teal-400' />
                                  </div>
                                  <div>
                                    <p className='text-sm font-black text-white'>{med.name}</p>
                                    <p className='text-[10px] text-slate-500 font-bold uppercase'>{med.dosagePerDay} Doses Daily • {med.totalQuantity} Units</p>
                                  </div>
                                </div>

                                <div className='flex-1 bg-black/40 p-3 sm:p-4 rounded-xl border border-white/5'>
                                  <p className='text-[9px] font-black text-slate-500 uppercase mb-1'>Rationale & Instructions</p>
                                  <p className='text-xs text-slate-300 italic leading-relaxed'>
                                    "{med.note || "No specific clinical note provided."}"
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AllAppointments