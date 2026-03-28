import React, { useContext, useEffect } from 'react'
import { AdminContext } from '../../context/AdminContext.js'
import { AppContext } from '../../context/AppContext.js'
import {
  RiStethoscopeLine,
  RiCalendarCheckLine,
  RiGroupLine,
  RiHistoryLine,
  RiCloseCircleLine,
  RiCheckboxCircleLine
} from '@remixicon/react'
import { useNavigate } from 'react-router-dom'
import type { AdminContextType, AppContextType, Appointment } from '../../types/index.js'
import { toast } from 'sonner'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { aToken, cancelAppointment, dashData, getDashData } = useContext(AdminContext) as AdminContextType
  const { slotDateFormat, setProgress } = useContext(AppContext) as AppContextType

  const handleRefresh = async () => {
    if (aToken) {
      setProgress(30);
      const toastId = toast.loading('Refreshing live feed...')
      await getDashData()
      setProgress(100);
      toast.success('Feed updated', { id: toastId })
    }
  }

  const handleCancel = async (id: string) => {
    setProgress(40);
    await cancelAppointment(id);
    setProgress(100);
  }

  const handleNavigate = (path: string) => {
    setProgress(50);
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setProgress(100), 400);
  }

  useEffect(() => {
    if (aToken) {
      getDashData()
    }
  }, [aToken, getDashData])

  if (!dashData) {
    return (
      <div className='p-6 md:p-10 animate-pulse'>
        <div className='h-8 w-48 bg-slate-200 rounded-full mb-8' />
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {[1, 2, 3].map(i => <div key={i} className='h-32 bg-slate-100 rounded-[32px]' />)}
        </div>
      </div>
    )
  }

  return (
    <div className='p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal'>
      <div className='max-w-7xl mx-auto'>

        {/* --- Header Section --- */}
        <div className='mb-8 md:mb-10'>
          <h1 className='text-2xl sm:text-3xl font-black text-slate-900'>System <span className='text-teal-500 font-serif italic normal-case'>Overview</span></h1>
          <p className='text-slate-500 text-xs sm:text-sm font-medium mt-1'>Administrative control panel for Serene Medical.</p>
        </div>

        {/* --- Stats Cards (Responsive Grid) --- */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 md:mb-12'>

          {/* Doctors Card */}
          <div onClick={() => handleNavigate('/doctor-list')} className='bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-portal border border-slate-100 flex items-center gap-6 group hover:bg-slate-900 transition-all duration-500 cursor-pointer active:scale-95'>
            <div className='p-3 sm:p-4 bg-teal-50 text-teal-600 rounded-xl sm:rounded-2xl group-hover:bg-teal-500 group-hover:text-white transition-all'>
              <RiStethoscopeLine size={24} className='sm:w-7 sm:h-7' />
            </div>
            <div>
              <p className='text-xl sm:text-2xl font-black text-slate-900 group-hover:text-white leading-none'>{dashData.doctors}</p>
              <p className='text-[9px] sm:text-[10px] font-black uppercase tracking-[2px] text-slate-400 mt-2 group-hover:text-teal-400'>Specialists</p>
            </div>
          </div>

          {/* Appointments Card */}
          <div onClick={() => handleNavigate('/all-appointments')} className='bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-portal border border-slate-100 flex items-center gap-6 group hover:bg-slate-900 transition-all duration-500 cursor-pointer active:scale-95'>
            <div className='p-3 sm:p-4 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl group-hover:bg-indigo-500 group-hover:text-white transition-all'>
              <RiCalendarCheckLine size={24} className='sm:w-7 sm:h-7' />
            </div>
            <div>
              <p className='text-xl sm:text-2xl font-black text-slate-900 group-hover:text-white leading-none'>{dashData.appointments}</p>
              <p className='text-[9px] sm:text-[10px] font-black uppercase tracking-[2px] text-slate-400 mt-2 group-hover:text-indigo-400'>Bookings</p>
            </div>
          </div>

          {/* Patients Card */}
          <div className='bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-portal border border-slate-100 flex items-center gap-6 group hover:bg-slate-900 transition-all duration-500 cursor-pointer active:scale-95 sm:col-span-2 lg:col-span-1'>
            <div className='p-3 sm:p-4 bg-rose-50 text-rose-600 rounded-xl sm:rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-all'>
              <RiGroupLine size={24} className='sm:w-7 sm:h-7' />
            </div>
            <div>
              <p className='text-xl sm:text-2xl font-black text-slate-900 group-hover:text-white leading-none'>{dashData.patients}</p>
              <p className='text-[9px] sm:text-[10px] font-black uppercase tracking-[2px] text-slate-400 mt-2 group-hover:text-rose-400'>Patients</p>
            </div>
          </div>

        </div>

        {/* --- Latest Bookings Feed --- */}
        <div className='bg-white rounded-[32px] sm:rounded-[48px] shadow-portal border border-slate-100 overflow-hidden'>
          <div className='px-6 sm:px-10 py-6 sm:py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30'>
            <div className='flex items-center gap-3'>
              <div className='w-2 h-2 rounded-full bg-teal-500 animate-pulse' />
              <p className='text-[9px] sm:text-[10px] font-black uppercase tracking-[2px] sm:tracking-[3px] text-slate-900'>Live Activity Feed</p>
            </div>
            <button
              onClick={handleRefresh}
              className='p-2 hover:bg-white rounded-lg transition-all active:scale-90'
            >
              <RiHistoryLine size={18} className='text-slate-400' />
            </button>
          </div>

          <div className='divide-y divide-slate-50'>
            {dashData.latestAppointments.map((item: Appointment) => (
              <div
                className='flex flex-col sm:flex-row items-center gap-4 px-6 sm:px-10 py-5 sm:py-6 hover:bg-slate-50/80 transition-all group'
                key={item._id}
              >
                <img className='w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover shadow-sm border-2 border-white' src={item.docData.image} alt="" />

                <div className='flex-1 text-center sm:text-left'>
                  <p className='text-sm font-black text-slate-900 group-hover:text-teal-600 transition-colors'>{item.docData.name}</p>
                  <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5'>{slotDateFormat(item.slotDate)}</p>
                </div>

                <div className='flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-end'>
                  {item.cancelled ? (
                    <div className='flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-500 rounded-full border border-red-100'>
                      <RiCloseCircleLine size={14} />
                      <span className='text-[10px] font-black uppercase tracking-widest'>Cancelled</span>
                    </div>
                  ) : item.isCompleted ? (
                    <div className='flex items-center gap-1.5 px-4 py-1.5 bg-teal-50 text-teal-600 rounded-full border border-teal-100'>
                      <RiCheckboxCircleLine size={14} />
                      <span className='text-[10px] font-black uppercase tracking-widest'>Completed</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCancel(item._id)}
                      className='p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95'
                      title="Abort Appointment"
                    >
                      <RiCloseCircleLine size={24} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className='p-6 sm:p-8 bg-slate-50/50 text-center border-t border-slate-50'>
            <button
              onClick={() => handleNavigate('/all-appointments')}
              className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 hover:text-slate-900 transition-colors active:scale-95'>
              View Full Registry Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard