import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { toast } from 'sonner'
import axios from 'axios'
import SkeletonCard from '../components/SkeletonCard.js'
import type { AppContextType, Appointment } from '../types/index.js'
import { motion } from 'framer-motion'
import {
  RiCalendarCheckLine,
  RiMapPin2Line,
  RiWallet3Line,
  RiCloseCircleLine,
  RiCheckboxCircleLine,
  RiTimeLine
} from "@remixicon/react"

const MyAppointments: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { backendUrl, token, getDoctorsData, setProgress } = context;

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const months: string[] = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct", "Nov", "Dec"]

  const slotDateFormat = (slotDate: string): string => {
    if (!slotDate) return ""
    const dateArray = slotDate.split('_')
    return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
  }

  const getUserAppointments = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
      if (data.success) {
        setAppointments(data.appointments.reverse())
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const cancelAppointment = async (appointmentId: string) => {
    try {
      setProgress(30)
      const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })
      if (data.success) {
        toast.success(data.message)
        getUserAppointments()
        getDoctorsData()
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProgress(100)
    }
  }

  const appointmentStripepay = async (appointmentId: string) => {
    try {
      setProgress(30)
      const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } })
      if (data.success) {
        window.location.replace(data.session_url)
      } else {
        toast.error(data.message)
        setProgress(100)
      }
    } catch (error: any) {
      toast.error(error.message)
      setProgress(100)
    }
  }

  useEffect(() => {
    if (token) getUserAppointments()
  }, [token])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='max-w-5xl mx-auto p-6 py-20 bg-clinic-bg min-h-screen'
    >
      <div className='flex flex-col md:flex-row justify-between items-end gap-4 mb-12 border-b border-slate-100 pb-8'>
        <div>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-teal-600 mb-3'>
            <RiCalendarCheckLine size={14} />
            <span className='text-[10px] font-black uppercase tracking-widest'>Patient Portal</span>
          </div>
          <h1 className='text-4xl font-black text-slate-900 uppercase tracking-tight'>
            My <span className='text-teal-500 italic font-serif normal-case'>Appointments</span>
          </h1>
        </div>
        <p className='text-slate-400 text-xs font-medium uppercase tracking-widest'>Total: {appointments.length} Sessions</p>
      </div>

      <div className='space-y-8'>
        {loading ? (
          Array(3).fill(0).map((_, i) => <SkeletonCard key={i} type="row" />)
        ) : (
          appointments.length > 0 ? (
            appointments.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className='bg-white p-6 md:p-8 rounded-[40px] flex flex-col md:flex-row gap-8 items-center shadow-clinical border border-slate-100 group'
              >
                {/* Doctor Visual Container */}
                <div className='relative shrink-0'>
                  <div className='w-32 h-32 md:w-40 md:h-40 rounded-[32px] overflow-hidden bg-slate-50 border border-slate-100 shadow-inner relative z-10'>
                    <img className='w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700' src={item.docData.image} alt="" />
                  </div>
                  {item.isCompleted && (
                    <div className='absolute -top-3 -right-3 bg-teal-500 text-white p-2 rounded-full shadow-lg z-20 border-4 border-white'>
                      <RiCheckboxCircleLine size={20} />
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className='flex-1 text-center md:text-left space-y-6'>
                  <div>
                    <p className='text-2xl font-black text-slate-900 group-hover:text-teal-600 transition-colors mb-1'>{item.docData.name}</p>
                    <p className='text-teal-600 text-[11px] font-black uppercase tracking-[2px]'>{item.docData.speciality}</p>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2'>
                    <div className='flex items-start gap-3 justify-center md:justify-start'>
                      <RiMapPin2Line size={18} className='text-slate-300' />
                      <div className='text-xs text-slate-500 font-medium leading-relaxed'>
                        <p>{item.docData.address?.line1}</p>
                        <p>{item.docData.address?.line2}</p>
                      </div>
                    </div>
                    <div className='flex items-start gap-3 justify-center md:justify-start'>
                      <RiTimeLine size={18} className='text-teal-500' />
                      <div className='text-xs text-slate-700 font-bold uppercase tracking-wider'>
                        <p className='text-slate-400 font-black text-[9px] mb-1'>Appointment Slot</p>
                        <p>{slotDateFormat(item.slotDate)} | {item.slotTime}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Column */}
                <div className='flex flex-col gap-3 w-full md:w-56'>
                  {!item.cancelled && !item.payment && !item.isCompleted && (
                    <>
                      <button
                        onClick={() => appointmentStripepay(item._id)}
                        className='w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-teal-500 transition-all flex items-center justify-center gap-2'
                      >
                        <RiWallet3Line size={16} /> Pay Online
                      </button>
                      <button
                        onClick={() => cancelAppointment(item._id)}
                        className='w-full py-4 rounded-2xl border border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all'
                      >
                        Cancel Booking
                      </button>
                    </>
                  )}

                  {item.cancelled && !item.isCompleted && (
                    <div className='flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-red-50 text-red-500 border border-red-100'>
                      <RiCloseCircleLine size={18} />
                      <span className='font-black text-[10px] uppercase tracking-widest'>Appointment Cancelled</span>
                    </div>
                  )}

                  {!item.cancelled && item.payment && !item.isCompleted && (
                    <div className='flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100'>
                      <RiWallet3Line size={18} />
                      <span className='font-black text-[10px] uppercase tracking-widest'>Payment Confirmed</span>
                    </div>
                  )}

                  {item.isCompleted && (
                    <div className='flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100'>
                      <RiCheckboxCircleLine size={18} />
                      <span className='font-black text-[10px] uppercase tracking-widest'>Session Completed</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className='bg-white p-20 rounded-[48px] text-center border border-dashed border-slate-200'>
              <RiCalendarCheckLine size={48} className='mx-auto text-slate-200 mb-4' />
              <p className='text-slate-400 font-black text-xs uppercase tracking-widest'>No active appointments found.</p>
            </div>
          )
        )}
      </div>
    </motion.div>
  )
}

export default MyAppointments