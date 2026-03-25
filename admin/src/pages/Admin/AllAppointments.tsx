import React, { useContext, useEffect } from 'react'
import { AdminContext } from '../../context/AdminContext.js'
import { AppContext } from '../../context/AppContext.js'
import { RiCalendarEventLine, RiCloseCircleLine, RiCheckboxCircleLine, RiTimeLine } from '@remixicon/react'
import type { AdminContextType, AppContextType, Appointment } from '../../types/index.js'

const AllAppointments: React.FC = () => {
  const { aToken, appointments, getAllAppointments, cancelAppointment } = useContext(AdminContext) as AdminContextType
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext) as AppContextType

  useEffect(() => {
    if (aToken) {
      getAllAppointments()
    }
  }, [aToken, getAllAppointments])

  return (
    <div className='p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal'>
      <div className='max-w-7xl mx-auto'>

        {/* --- Header Section --- */}
        <div className='mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-3 bg-slate-900 rounded-2xl text-teal-400 shadow-lg'>
                <RiCalendarEventLine size={24} />
              </div>
              <h1 className='text-3xl font-black text-slate-900 tracking-tight'>Appointment <span className='text-teal-500 font-serif italic normal-case'>Registry</span></h1>
            </div>
            <p className='text-slate-500 font-medium ml-14'>Real-time overview of all clinical bookings.</p>
          </div>

          <div className='bg-white px-6 py-3 rounded-2xl shadow-portal border border-slate-100 flex items-center gap-4'>
            <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Total Logs</p>
            <span className='text-xl font-black text-slate-900'>{appointments.length}</span>
          </div>
        </div>

        {/* --- Table Container --- */}
        <div className='bg-white rounded-[40px] shadow-portal border border-slate-100 overflow-hidden'>

          <div className='max-h-[70vh] overflow-y-auto hide-scrollbar'>

            {/* Table Header (Desktop) */}
            <div className='hidden lg:grid grid-cols-[0.5fr_2.5fr_0.8fr_2.2fr_2.2fr_1fr_1fr] items-center py-6 px-10 bg-slate-900 text-white sticky top-0 z-10'>
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
                <div
                  key={item._id}
                  className='flex flex-col lg:grid lg:grid-cols-[0.5fr_2.5fr_0.8fr_2.2fr_2.2fr_1fr_1fr] items-center py-6 px-6 lg:px-10 hover:bg-slate-50/80 transition-all duration-300 group'
                >
                  {/* # Index */}
                  <p className='hidden lg:block text-xs font-black text-slate-300 group-hover:text-teal-500 transition-colors'>
                    {(index + 1).toString().padStart(2, '0')}
                  </p>

                  {/* Patient Info */}
                  <div className='flex items-center gap-4 w-full lg:w-auto mb-4 lg:mb-0'>
                    <img className='w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md' src={item.userData.image} alt="" />
                    <div>
                      <p className='text-sm font-black text-slate-900'>{item.userData.name}</p>
                      <p className='lg:hidden text-[10px] font-bold text-slate-400'>Patient</p>
                    </div>
                  </div>

                  {/* Age */}
                  <p className='hidden lg:block text-sm font-bold text-slate-600'>{calculateAge(item.userData.dob)} yrs</p>

                  {/* Schedule */}
                  <div className='flex flex-col gap-1 w-full lg:w-auto mb-4 lg:mb-0'>
                    <div className='flex items-center gap-2 text-slate-900 font-black text-xs'>
                      <RiTimeLine size={14} className='text-teal-500' />
                      {slotDateFormat(item.slotDate)}
                    </div>
                    <p className='text-[10px] font-bold text-slate-400 ml-5 uppercase tracking-wider'>{item.slotTime}</p>
                  </div>

                  {/* Doctor Info */}
                  <div className='flex items-center gap-3 w-full lg:w-auto mb-4 lg:mb-0'>
                    <div className='w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200'>
                      <img className='w-full h-full object-cover' src={item.docData.image} alt="" />
                    </div>
                    <p className='text-xs font-bold text-slate-700'>{item.docData.name}</p>
                  </div>

                  {/* Billing */}
                  <p className='w-full lg:w-auto mb-4 lg:mb-0 text-sm font-black text-slate-900'>
                    {currency}{item.amount}
                  </p>

                  {/* Actions / Status */}
                  <div className='flex justify-center w-full lg:w-auto'>
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
                        onClick={() => cancelAppointment(item._id)}
                        className='group/btn flex items-center gap-2 p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all'
                        title="Cancel Appointment"
                      >
                        <RiCloseCircleLine size={24} className='group-hover/btn:rotate-90 transition-transform' />
                      </button>
                    )}
                  </div>

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