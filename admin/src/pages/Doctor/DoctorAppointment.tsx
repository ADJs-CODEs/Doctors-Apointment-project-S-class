import React, { useContext, useEffect } from 'react'
import { DoctorContext } from '../../context/DoctorContext.js'
import { AppContext } from '../../context/AppContext.js'
import { assets } from '../../assets/assets/assets_admin/assets.js'
import type { DoctorContextType, AppContextType, Appointment } from '../../types/index.js'

const DoctorAppointment: React.FC = () => {

  const { dToken, appointments, getAppointments, completeAppointment, cancelAppointment } = useContext(DoctorContext) as DoctorContextType
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext) as AppContextType

  useEffect(() => {
    if (dToken) {
      getAppointments()
    }
  }, [dToken, getAppointments])

  return (
    <div className='w-full max-w-6xl m-5 animate-reveal'>
      <p className='mb-5 text-2xl font-bold text-gray-800'>All Appointments</p>

      <div className='bg-white border rounded-2xl text-sm max-h-[80vh] min-h-[60vh] overflow-y-scroll hide-scrollbar shadow-sm'>

        {/* --- Table Header --- */}
        <div className='hidden sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-4 px-6 border-b bg-gray-50 text-gray-600 font-bold sticky top-0 z-10'>
          <p>#</p>
          <p>Patient</p>
          <p>Payment</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fees</p>
          <p className='text-center'>Action</p>
        </div>

        {/* --- Table Body --- */}
        {
          appointments && appointments.length > 0 ? (
            [...appointments].reverse().map((item: Appointment, index: number) => (
              <div
                className='flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 items-center text-gray-500 py-4 px-6 border-b hover:bg-blue-50/30 transition-colors'
                key={item._id || index}
              >
                <p className='max-sm:hidden font-medium'>{index + 1}</p>

                <div className='flex items-center gap-3'>
                  <img className='w-10 h-10 rounded-full border bg-gray-100 object-cover' src={item.userData.image} alt="" />
                  <p className='text-gray-900 font-bold'>{item.userData.name}</p>
                </div>

                <div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${item.payment ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
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
                  {item.cancelled ? (
                    <p className='text-red-400 text-xs font-bold uppercase tracking-wider bg-red-50 px-3 py-1 rounded-full'>Cancelled</p>
                  ) : item.isCompleted ? (
                    <p className='text-emerald-500 text-xs font-bold uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full'>Completed</p>
                  ) : (
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => cancelAppointment(item._id)}
                        className='w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-full transition-all'
                        title="Cancel"
                      >
                        <img className='w-7' src={assets.cancel_icon} alt="Cancel" />
                      </button>
                      <button
                        onClick={() => completeAppointment(item._id)}
                        className='w-10 h-10 flex items-center justify-center hover:bg-emerald-50 rounded-full transition-all'
                        title="Complete"
                      >
                        <img className='w-7' src={assets.tick_icon} alt="Complete" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
              <p className='text-lg font-medium'>No appointments booked yet.</p>
            </div>
          )
        }
      </div>
    </div>
  )
}

export default DoctorAppointment