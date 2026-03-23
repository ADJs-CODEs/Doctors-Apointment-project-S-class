import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../Context/AppContext.js';
import { assets } from '../assets/assets/assets_frontend/assets.js'
import RelatedDoctors from '../components/RelatedDoctors.js';
import { toast } from 'sonner';
import axios from 'axios';
import type { AppContextType, Doctor } from '../types/index.js';

// Define the structure of a single time slot
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
    if (info) {
      setDocInfo(info)
    }
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

        let day = currentDate.getDate()
        let month = currentDate.getMonth() + 1
        let year = currentDate.getFullYear()

        const slotDate = `${day}_${month}_${year}`
        const slotTimeStr = formattedTime

        // Ensure slots_booked exists and check availability
        const isSlotAvailable = docInfo.slots_booked?.[slotDate]?.includes(slotTimeStr) ? false : true

        if (isSlotAvailable) {
          timeSlots.push({
            datetime: new Date(currentDate),
            time: formattedTime
          })
        }

        currentDate.setMinutes(currentDate.getMinutes() + 30)
      }

      if (timeSlots.length > 0) {
        setDocSlots(prev => ([...prev, timeSlots]))
      }
    }
  }

  const bookAppointment = async () => {
    if (!token) {
      toast.warning('Login to book appointment')
      return navigate('/login')
    }

    try {
      if (!slotTime) {
        return toast.info('Please select a time slot')
      }
      // 1. Use optional chaining (?.) to safely check if the slot exists got this logic also based on research
      const date = docSlots[slotIndex]?.[0]?.datetime

      // 2. Adding a check to ensure 'date' actually exists before moving forward got this logic based off research
      if (!date) {
        return toast.error("No slots available for this day")
      }
      const slotDate = `${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`

      const { data } = await axios.post(
        `${backendUrl}/api/user/book-appointment`,
        { docId, slotDate, slotTime },
        { headers: { token } }
      )

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

  useEffect(() => {
    fetchDocInfo()
  }, [doctors, docId])

  useEffect(() => {
    getAvailableSlots()
  }, [docInfo])

  return docInfo && (
    <div className='animate-reveal'>
      {/* -------------- Doctor Details ----------- */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <div>
          <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt={docInfo.name} />
        </div>
        <div className='flex-1 border border-gray-400 rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>
          <p className='flex items-center gap-2 text-2xl font-medium text-gray-900'>
            {docInfo.name} <img className='w-5' src={assets.verified_icon} alt="Verified" />
          </p>
          <div className='flex items-center gap-2 text-sm mt-1 text-gray-600'>
            <p>{docInfo.degree} - {docInfo.speciality}</p>
            <button className='py-0.5 px-2 border text-xs rounded-full'>{docInfo.experience}</button>
          </div>
          <div>
            <p className='flex items-center gap-1 text-sm font-medium text-gray-900 mt-3'>
              About <img src={assets.info_icon} alt="Info" />
            </p>
            <p className='text-sm text-gray-500 max-w-[700px] mt-1'>{docInfo.about}</p>
          </div>
          <p className='text-gray-600 mt-4'>
            Appointment Fee: <span className='text-gray-900 font-semibold'>{currencySymbol}{docInfo.fees}</span>
          </p>
        </div>
      </div>

      {/* -----------Booking Slots ------------- */}
      <div className='sm:pl-4 sm:ml-72 mt-4 font-medium text-gray-700'>
        <p>Booking slots</p>
        <div className='flex gap-3 items-center w-full overflow-x-scroll mt-4'>
          {docSlots.length > 0 && docSlots.map((item, index) => (
            <div
              onClick={() => { setSlotIndex(index); setSlotTime('') }}
              className={`text-center py-6 min-w-16 rounded-full cursor-pointer transition-all ${slotIndex === index ? 'bg-primary text-white' : 'border border-gray-200'}`}
              key={index}
            >
              <p>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
              <p>{item[0] && item[0].datetime.getDate()}</p>
            </div>
          ))}
        </div>

        <div className='flex items-center gap-3 w-full overflow-x-scroll mt-4'>
          {docSlots.length > 0 && docSlots[slotIndex]?.map((item, index) => (
            <p
              onClick={() => setSlotTime(item.time)}
              className={`text-sm font-light shrink-0 px-5 py-2 rounded-full cursor-pointer transition-all ${item.time === slotTime ? 'bg-primary text-white' : 'text-gray-400 border border-gray-300'}`}
              key={index}
            >
              {item.time.toLowerCase()}
            </p>
          ))}
        </div>
        <button
          onClick={bookAppointment}
          className='bg-primary text-white text-sm font-light px-14 py-3 rounded-full my-6 hover:scale-105 transition-all'
        >
          Book an appointment
        </button>
      </div>

      {/* Listing Related Doctors */}
      <RelatedDoctors docId={docId || ''} speciality={docInfo.speciality} />
    </div>
  )
}

export default Appointments