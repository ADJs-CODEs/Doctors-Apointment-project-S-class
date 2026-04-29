import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../Context/AppContext.js';
import RelatedDoctors from '../components/RelatedDoctors.js';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiVerifiedBadgeFill,
  RiInformationLine,
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiCalendarEventLine
} from '@remixicon/react';
import type { AppContextType, Doctor } from '../types/index.js';
import axiosInstance from '../utils/axiosInstance.js';
import { API_PATHS } from '../utils/apiPath.js';

interface Slot {
  datetime: Date;
  time: string;
}

const Appointments: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const context = useContext(AppContext) as AppContextType;
  const { doctors, currencySymbol, token, getDoctorsData } = context;

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const navigate = useNavigate()

  const [docInfo, setDocInfo] = useState<Doctor | null>(null)
  const [docSlots, setDocSlots] = useState<Slot[][]>([])
  const [slotIndex, setSlotIndex] = useState<number>(0)
  const [slotTime, setSlotTime] = useState<string>('')

  const fetchDocInfo = async () => {
    const info = doctors.find(doc => doc._id === docId);
    if (info) setDocInfo(info)
  }

  const getAvailableSlots = async () => {
    if (!docInfo) return;
    setDocSlots([])
    let today = new Date()

    for (let i = 0; i < 7; i++) {
      let currentDate = new Date(today)
      currentDate.setDate(today.getDate() + i)
      let endTime = new Date(currentDate)
      endTime.setHours(21, 0, 0, 0)

      if (today.getDate() === currentDate.getDate()) {
        currentDate.setHours(currentDate.getHours() > 10 ? currentDate.getHours() + 1 : 10)
        currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0)
      } else {
        currentDate.setHours(10)
        currentDate.setMinutes(0)
      }

      let timeSlots: Slot[] = []
      while (currentDate < endTime) {
        let formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        let day = currentDate.getDate(), month = currentDate.getMonth() + 1, year = currentDate.getFullYear()
        const slotDate = `${day}_${month}_${year}`
        const isSlotAvailable = !docInfo.slots_booked?.[slotDate]?.includes(formattedTime)

        if (isSlotAvailable) {
          timeSlots.push({ datetime: new Date(currentDate), time: formattedTime })
        }
        currentDate.setMinutes(currentDate.getMinutes() + 30)
      }
      if (timeSlots.length > 0) setDocSlots(prev => ([...prev, timeSlots]))
    }
  }

  const bookAppointment = async () => {
    if (!token) {
      toast.warning('Please login to continue')
      return navigate('/login')
    }
    try {
      if (!slotTime) return toast.info('Please select a time slot')
      const date = docSlots[slotIndex]?.[0]?.datetime
      if (!date) return toast.error("No slots available")

      const slotDate = `${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`
      const { data } = await axiosInstance.post(API_PATHS.USER.BOOK_APPOINTMENT, { docId, slotDate, slotTime })

      if (data.success) {
        toast.success(data.message)
        getDoctorsData()
        navigate('/my-appointments')
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Booking failed. Try again.")
    }
  }

  useEffect(() => { fetchDocInfo() }, [doctors, docId])
  useEffect(() => { getAvailableSlots() }, [docInfo])

  return docInfo && (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className='max-w-6xl mx-auto py-8 md:py-12 px-4 md:px-6'
    >
      {/* --- Doctor Hero Card --- */}
      <div className='flex flex-col lg:flex-row gap-8 items-stretch mb-12 md:mb-16'>
        <div className='w-full lg:w-80 shrink-0'>
          <img
            className='w-full aspect-[4/5] object-cover rounded-[32px] md:rounded-[40px] bg-slate-900 shadow-xl'
            src={docInfo.image}
            alt={docInfo.name}
          />
        </div>

        <div className='flex-1 bg-white border border-slate-100 p-8 md:p-12 rounded-[32px] md:rounded-[48px] shadow-sm relative overflow-hidden'>
          {/* Subtle decoration */}
          <div className='absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-3xl rounded-full -mr-16 -mt-16' />

          <div className='flex flex-wrap items-center gap-3 mb-4'>
            <h1 className='text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter'>{docInfo.name}</h1>
            <RiVerifiedBadgeFill className='text-teal-500' size={24} />
          </div>

          <div className='flex items-center gap-4 text-[10px] md:text-xs font-black uppercase tracking-[2px] text-teal-600 mb-8'>
            <p>{docInfo.degree} — {docInfo.speciality}</p>
            <span className='px-3 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-100'>
              {docInfo.experience} Experience
            </span>
          </div>

          <div className='space-y-4 mb-10'>
            <p className='flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-[2px]'>
              <RiInformationLine size={16} className='text-teal-500' /> Professional Bio
            </p>
            <p className='text-slate-500 text-sm md:text-base leading-relaxed max-w-2xl font-medium'>{docInfo.about}</p>
          </div>

          <div className='pt-8 border-t border-slate-50 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-3 bg-teal-50 rounded-2xl text-teal-600'>
                <RiMoneyDollarCircleLine size={24} />
              </div>
              <div>
                <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest'>Consultation Fee</p>
                <p className='text-xl font-black text-slate-900'>{currencySymbol}{docInfo.fees}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Booking Section --- */}
      <div className='bg-white p-8 md:p-12 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-sm'>
        <div className='flex items-center gap-3 mb-10'>
          <RiCalendarEventLine className='text-teal-500' />
          <h2 className='text-xl font-black text-slate-900 uppercase tracking-tight'>Book <span className='text-teal-500 font-serif normal-case italic'>Appointment</span></h2>
        </div>

        {/* Date Selector */}
        <div className='flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-4'>
          {docSlots.length > 0 && docSlots.map((item, index) => (
            <button
              key={index}
              onClick={() => { setSlotIndex(index); setSlotTime('') }}
              className={`flex flex-col items-center justify-center min-w-[75px] md:min-w-[85px] py-5 md:py-6 rounded-[24px] md:rounded-[32px] transition-all duration-300 ${slotIndex === index
                ? 'bg-slate-900 text-white shadow-xl translate-y-[-4px]'
                : 'bg-slate-50 text-slate-400 border border-transparent hover:border-teal-200 hover:bg-white'
                }`}
            >
              <span className='text-[9px] md:text-[10px] font-black mb-1 opacity-60'>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</span>
              <span className='text-lg md:text-xl font-black'>{item[0] && item[0].datetime.getDate()}</span>
            </button>
          ))}
        </div>

        {/* Time Selector */}
        <div className='flex flex-wrap gap-2 md:gap-3 mt-10'>
          <AnimatePresence mode='wait'>
            {docSlots[slotIndex]?.map((item) => (
              <motion.button
                key={`${slotIndex}-${item.time}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSlotTime(item.time)}
                className={`px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${item.time === slotTime
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                  : 'bg-white text-slate-500 border border-slate-100 hover:border-teal-500/30'
                  }`}
              >
                {item.time}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={bookAppointment}
          className='mt-12 w-full md:w-auto px-12 md:px-16 py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-[2px] text-[10px] md:text-[11px] shadow-lg hover:bg-teal-600 transition-all'
        >
          Confirm Appointment
        </motion.button>
      </div>

      {/* --- Related Doctors --- */}
      <div className='mt-20 md:mt-32'>
        <div className='flex items-center gap-3 mb-10'>
          <div className='w-12 h-[2px] bg-teal-500' />
          <h2 className='text-lg font-black text-slate-900 uppercase tracking-widest'>Similar Specialists</h2>
        </div>
        <RelatedDoctors docId={docId || ''} speciality={docInfo.speciality} />
      </div>
    </motion.div>
  )
}

export default Appointments