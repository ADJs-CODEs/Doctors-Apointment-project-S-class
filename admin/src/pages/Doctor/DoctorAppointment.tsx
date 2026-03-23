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
    <div className='w-full max-w-6xl m-5'>
      <p className='mb-3 text-lg font-medium'>All Appointments</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] min-h-[50vh] overflow-y-scroll'>

        {/* Table Header */}
        <div className='max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-3 px-6 border-b'>
          <p>#</p>
          <p>Patient</p>
          <p>Payment</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fees</p>
          <p>Action</p>
        </div>

        {/* Table Body */}
        {
          [...appointments].reverse().map((item: Appointment, index: number) => (
            <div
              className='flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50'
              key={item._id || index}
            >
              <p className='max-sm:hidden'>{index + 1}</p>

              <div className='flex items-center gap-2'>
                <img className='w-8 rounded-full' src={item.userData.image} alt={item.userData.name} />
                <p>{item.userData.name}</p>
              </div>

              <div>
                <p className='text-xs inline border border-primary px-2 rounded-full'>
                  {item.payment ? 'Online' : 'CASH'}
                </p>
              </div>

              <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
              <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
              <p>{currency}{item.amount}</p>

              {
                item.cancelled
                  ? <p className='text-red-400 text-xs font-medium'>cancelled</p>
                  : item.isCompleted
                    ? <p className='text-green-500 text-xs font-medium'>Completed</p>
                    : <div className='flex'>
                      <img
                        onClick={() => cancelAppointment(item._id)}
                        className='w-10 cursor-pointer'
                        src={assets.cancel_icon}
                        alt="Cancel"
                      />
                      <img
                        onClick={() => completeAppointment(item._id)}
                        className='w-10 cursor-pointer'
                        src={assets.tick_icon}
                        alt="Complete"
                      />
                    </div>
              }
            </div>
          ))
        }
      </div>
    </div>
  )
}

export default DoctorAppointment