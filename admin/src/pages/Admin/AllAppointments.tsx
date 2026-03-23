import React, { useContext, useEffect } from 'react'
import { AdminContext } from '../../context/AdminContext.js'
import { AppContext } from '../../context/AppContext.js'
import { assets } from '../../assets/assets/assets_admin/assets.js'
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
    <div className='w-full max-w-6xl m-5 flex flex-col'>
      <p className='mb-3 text-lg font-medium'>All Appointments</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] min-h-[60vh] overflow-y-scroll no-scrollbar'>

        {/* Table Header */}
        <div className='hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] grid-flow-col py-3 px-6 border-b'>
          <p>#</p>
          <p>Patient</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Doctor</p>
          <p>Fees</p>
          <p>Actions</p>
        </div>

        {/* Table Body */}
        {appointments.map((item: Appointment, index: number) => (
          <div
            className='flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50'
            key={item._id}
          >
            <p className='max-sm:hidden'>{index + 1}</p>

            <div className='flex items-center gap-2'>
              <img className='w-8 rounded-full' src={item.userData.image} alt={item.userData.name} />
              <p>{item.userData.name}</p>
            </div>

            <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>

            <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>

            <div className='flex items-center gap-2'>
              <img className='w-8 rounded-full' src={item.docData.image} alt={item.docData.name} />
              <p>{item.docData.name}</p>
            </div>

            <p>{currency}{item.amount}</p>

            {item.cancelled
              ? <p className='text-red-400 text-xs font-medium'>cancelled</p>
              : item.isCompleted
                ? <p className='text-green-400 text-xs font-medium'>Completed</p>
                : <img
                  onClick={() => cancelAppointment(item._id)}
                  className='w-10 cursor-pointer mx-auto hover:opacity-70 transition-all'
                  src={assets.cancel_icon}
                  alt="Cancel"
                />
            }

          </div>
        ))}
      </div>
    </div>
  )
}

export default AllAppointments