import React, { useContext, useEffect } from 'react'
import { DoctorContext } from '../../context/DoctorContext.js'
import { AppContext } from '../../context/AppContext.js'
import { assets } from '../../assets/assets/assets_admin/assets.js'
import type { DoctorContextType, AppContextType, Appointment } from '../../types/index.js'

const DoctorDashboard: React.FC = () => {
  const { dToken, dashData, getDashData, completeAppointment, cancelAppointment } = useContext(DoctorContext) as DoctorContextType
  const { currency, slotDateFormat } = useContext(AppContext) as AppContextType

  useEffect(() => {
    if (dToken) {
      getDashData()
    }
  }, [dToken, getDashData])

  // 🛡️ Guard to prevent "Cannot read properties of null"
  if (!dashData) return null;

  // 🛠️ Handle both singular and plural naming from backend
  const latestBookings = dashData.latestAppointments || dashData.latestAppointment || [];

  return (
    <div className='m-5 space-y-6'>

      {/* --- Stats Grid --- */}
      <div className='flex flex-wrap gap-4'>

        {/* Earnings Card */}
        <div className='flex-1 min-w-[240px] bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4'>
          <div className='p-3 bg-emerald-50 rounded-xl'>
            <img className='w-8' src={assets.earning_icon} alt="" />
          </div>
          <div>
            <p className='text-2xl font-bold text-gray-800'>{currency} {dashData.earnings}</p>
            <p className='text-sm text-gray-400 font-medium uppercase tracking-wider'>Total Earnings</p>
          </div>
        </div>

        {/* Appointments Card */}
        <div className='flex-1 min-w-[240px] bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4'>
          <div className='p-3 bg-blue-50 rounded-xl'>
            <img className='w-8' src={assets.appointments_icon} alt="" />
          </div>
          <div>
            <p className='text-2xl font-bold text-gray-800'>{dashData.appointments}</p>
            <p className='text-sm text-gray-400 font-medium uppercase tracking-wider'>Total Bookings</p>
          </div>
        </div>

        {/* Patients Card */}
        <div className='flex-1 min-w-[240px] bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4'>
          <div className='p-3 bg-purple-50 rounded-xl'>
            <img className='w-8' src={assets.patients_icon} alt="" />
          </div>
          <div>
            <p className='text-2xl font-bold text-gray-800'>{dashData.patients}</p>
            <p className='text-sm text-gray-400 font-medium uppercase tracking-wider'>Unique Patients</p>
          </div>
        </div>
      </div>

      {/* --- Latest Bookings Table --- */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
        <div className='flex items-center gap-3 px-6 py-5 border-b border-gray-50 bg-gray-50/50'>
          <img className='w-5' src={assets.list_icon} alt="" />
          <p className='font-bold text-gray-700'>Latest Bookings</p>
        </div>

        <div className='divide-y divide-gray-50'>
          {latestBookings.length > 0 ? (
            latestBookings.map((item: Appointment, index: number) => (
              <div className='flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 transition-colors' key={index}>
                <div className='flex items-center gap-3'>
                  <img className='rounded-full w-12 h-12 object-cover border-2 border-white shadow-sm' src={item.userData.image} alt="" />
                  <div>
                    <p className='text-gray-900 font-semibold'>{item.userData.name}</p>
                    <p className='text-xs text-gray-500'>{slotDateFormat(item.slotDate)}</p>
                  </div>
                </div>

                <div className='flex items-center gap-3'>
                  {item.cancelled ? (
                    <span className='px-3 py-1 rounded-full bg-red-50 text-red-500 text-xs font-bold uppercase tracking-tighter'>Cancelled</span>
                  ) : item.isCompleted ? (
                    <span className='px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-tighter'>Completed</span>
                  ) : (
                    <div className='flex items-center gap-1'>
                      <button
                        onClick={() => cancelAppointment(item._id)}
                        className='p-2 hover:bg-red-50 rounded-full transition-colors'
                        title="Cancel Appointment"
                      >
                        <img className='w-7 opacity-70 hover:opacity-100' src={assets.cancel_icon} alt="Cancel" />
                      </button>
                      <button
                        onClick={() => completeAppointment(item._id)}
                        className='p-2 hover:bg-emerald-50 rounded-full transition-colors'
                        title="Mark Completed"
                      >
                        <img className='w-7 opacity-70 hover:opacity-100' src={assets.tick_icon} alt="Complete" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className='p-10 text-center text-gray-400 font-medium'>
              No recent bookings to show.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DoctorDashboard