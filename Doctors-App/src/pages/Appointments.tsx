import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../Context/AppContext.js';
import { assets } from '../assets/assets/assets_frontend/assets.js'
import RelatedDoctors from '../components/RelatedDoctors.js';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { RiVerifiedBadgeFill, RiInformationLine, RiTimeLine, RiMoneyDollarCircleLine } from '@remixicon/react';
import type { AppContextType, Doctor } from '../types/index.js';

interface Slot {
  datetime: Date;
  time: string;
}

const Appointments: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const context = useContext(AppContext) as AppContextType;
  const { doctors, currencySymbol, backendUrl, token, getDoctorsData } = context;

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
      const { data } = await axios.post(`${backendUrl}/api/user/book-appointment`, { docId, slotDate, slotTime }, { headers: { token } })

      if (data.success) {
        toast.success(data.message)
        getDoctorsData()
        navigate('/my-appointments')
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  useEffect(() => { fetchDocInfo() }, [doctors, docId])
  useEffect(() => { getAvailableSlots() }, [docInfo])

  return docInfo && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='max-w-6xl mx-auto py-12 px-4'
    >
      {/* --- Doctor Hero Card --- */}
      <div className='flex flex-col lg:flex-row gap-8 items-start mb-16'>
        <div className='w-full lg:w-80 shrink-0'>
          <img
            className='w-full aspect-[4/5] object-cover rounded-[40px] bg-teal-500 shadow-clinical'
            src={docInfo.image}
            alt={docInfo.name}
          />
        </div>

        <div className='flex-1 bg-white border border-slate-100 p-8 md:p-12 rounded-[48px] shadow-portal relative'>
          <div className='flex flex-wrap items-center gap-3 mb-4'>
            <h1 className='text-3xl md:text-4xl font-black text-slate-900'>{docInfo.name}</h1>
            <RiVerifiedBadgeFill className='text-teal-500' size={28} />
          </div>

          <div className='flex items-center gap-4 text-sm font-bold uppercase tracking-widest text-teal-600 mb-8'>
            <p>{docInfo.degree} — {docInfo.speciality}</p>
            <span className='px-3 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-100 text-[10px]'>
              {docInfo.experience} Experience
            </span>
          </div>

          <div className='space-y-4 mb-10'>
            <p className='flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-[2px]'>
              <RiInformationLine size={16} className='text-teal-500' /> Professional Bio
            </p>
            <p className='text-slate-500 leading-relaxed max-w-2xl font-medium'>{docInfo.about}</p>
          </div>

          <div className='pt-8 border-t border-slate-50 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-3 bg-teal-50 rounded-2xl text-teal-600'>
                <RiMoneyDollarCircleLine size={24} />
              </div>
              <div>
                <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Consultation Fee</p>
                <p className='text-xl font-black text-slate-900'>{currencySymbol}{docInfo.fees}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Booking Section --- */}
      <div className='bg-slate-50/50 p-8 md:p-12 rounded-[48px] border border-slate-100'>
        <div className='flex items-center gap-3 mb-10'>
          <RiTimeLine className='text-teal-500' />
          <h2 className='text-xl font-black text-slate-900 uppercase tracking-tight'>Select <span className='text-teal-500 font-serif normal-case italic'>Time Slot</span></h2>
        </div>

        {/* Date Selector */}
        <div className='flex gap-4 overflow-x-auto hide-scrollbar pb-4'>
          {docSlots.length > 0 && docSlots.map((item, index) => (
            <button
              key={index}
              onClick={() => { setSlotIndex(index); setSlotTime('') }}
              className={`flex flex-col items-center justify-center min-w-[70px] py-5 rounded-[32px] transition-all duration-300 ${slotIndex === index
                  ? 'bg-slate-900 text-white shadow-xl scale-105'
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-teal-200'
                }`}
            >
              <span className='text-[10px] font-black mb-1'>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</span>
              <span className='text-lg font-black'>{item[0] && item[0].datetime.getDate()}</span>
            </button>
          ))}
        </div>

        {/* Time Selector */}
        <div className='flex flex-wrap gap-3 mt-8'>
          <AnimatePresence mode='wait'>
            {docSlots[slotIndex]?.map((item, index) => (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.time}
                onClick={() => setSlotTime(item.time)}
                className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${item.time === slotTime
                    ? 'bg-teal-500 text-white shadow-neon scale-105'
                    : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
                  }`}
              >
                {item.time}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={bookAppointment}
          className='mt-12 w-full md:w-auto px-16 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[2px] text-xs shadow-clinical hover:bg-teal-600 transition-all'
        >
          Confirm Appointment
        </motion.button>
      </div>

      {/* --- Footer Listing --- */}
      <div className='mt-24'>
        <RelatedDoctors docId={docId || ''} speciality={docInfo.speciality} />
      </div>
    </motion.div>
  )
}

export default Appointments