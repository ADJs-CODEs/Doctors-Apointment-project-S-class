import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { toast } from 'sonner'
import axios from 'axios'
import type { AppContextType, Appointment } from '../types/index.js'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  RiHeartPulseLine, 
  RiDashboardLine, 
  RiTempHotLine, 
  RiMedicineBottleLine, 
  RiArrowRightSLine,
  RiUploadCloud2Line // Better icon for mobile upload
} from "@remixicon/react"

const MyProfile: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { userData, setUserData, token, backendUrl, loadUserProfileData, setProgress } = context;
  const navigate = useNavigate();

  const [isEdit, setIsEdit] = useState<boolean>(false)
  const [image, setImage] = useState<File | false | undefined>(false)
  const [latestAppointment, setLatestAppointment] = useState<Appointment | null>(null)

  const getLatestHealthData = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
      if (data.success && data.appointments.length > 0) {
        const completedWithData = data.appointments
          .reverse()
          .find((app: Appointment) => app.isCompleted && app.healthData);
        setLatestAppointment(completedWithData || null);
      }
    } catch (error: any) {
      console.error("Error fetching vitals:", error.message)
    }
  }

  const updateUserProfileData = async () => {
    try {
      if (!userData) return;
      setProgress(30)
      const formData = new FormData()
      formData.append('name', userData.name)
      formData.append('phone', userData.phone)
      formData.append('gender', userData.gender)
      formData.append('address', JSON.stringify(userData.address))
      formData.append('dob', userData.dob)
      if (image) formData.append('image', image)

      const { data } = await axios.post(backendUrl + '/api/user/update-profile', formData, { headers: { token } })
      if (data.success) {
        toast.success(data.message)
        await loadUserProfileData()
        setIsEdit(false)
        setImage(false)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProgress(100)
    }
  }

  useEffect(() => {
    if (token) getLatestHealthData();
  }, [token])

  if (!userData || !token) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className='max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10'
    >
      {/* --- HEADER SECTION --- */}
      <div className='bg-white border border-slate-100 p-6 md:p-10 rounded-[30px] md:rounded-[48px] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-6 md:gap-10 mb-8'>
        
        {/* Profile Image */}
        <div className='relative shrink-0'>
          <div className='w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-lg ring-1 ring-slate-100'>
            {isEdit ? (
              <label htmlFor="image" className="cursor-pointer relative block h-full w-full">
                <img className='w-full h-full object-cover opacity-40' src={image ? URL.createObjectURL(image) : userData.image} alt="" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <RiUploadCloud2Line className="text-teal-600" size={24} />
                </div>
                <input onChange={(e) => setImage(e.target.files ? e.target.files[0] : false)} type='file' id='image' hidden />
              </label>
            ) : (
              <img className='w-full h-full object-cover' src={userData.image} alt="Profile" />
            )}
          </div>
        </div>

        {/* User Info */}
        <div className='flex-1 text-center md:text-left space-y-2'>
          {isEdit ? (
            <input
              className='bg-slate-50 border border-slate-200 text-2xl md:text-3xl font-black px-4 py-2 rounded-2xl outline-none focus:border-teal-500 w-full'
              value={userData.name}
              onChange={e => setUserData((prev: any) => ({ ...prev, name: e.target.value }))}
            />
          ) : (
            <h1 className='text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase'>{userData.name}</h1>
          )}
          <div className='inline-flex items-center px-3 py-1 bg-teal-50 text-teal-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-teal-100'>
            ADJ's CODEs Verified
          </div>
          <p className='text-slate-400 text-sm font-bold'>{userData.email}</p>
        </div>

        <button
          onClick={isEdit ? updateUserProfileData : () => setIsEdit(true)}
          className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${isEdit ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'bg-slate-900 text-white shadow-lg shadow-slate-200'}`}
        >
          {isEdit ? 'Sync Changes' : 'Edit Profile'}
        </button>
      </div>

      {/* --- VITALS SECTION (3-Column Grid) --- */}
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8'>
        {/* Heart Rate */}
        <div className='bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm border-b-4 border-b-rose-500'>
          <div className='flex items-center gap-3 mb-4'>
            <RiHeartPulseLine className='text-rose-500' size={18} />
            <span className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Pulse</span>
          </div>
          <p className='text-3xl font-black text-slate-900'>{latestAppointment?.healthData?.heartRate || '--'} <span className='text-xs text-slate-400'>BPM</span></p>
        </div>

        {/* BP */}
        <div className='bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm border-b-4 border-b-blue-500'>
          <div className='flex items-center gap-3 mb-4'>
            <RiDashboardLine className='text-blue-500' size={18} />
            <span className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Pressure</span>
          </div>
          <p className='text-3xl font-black text-slate-900'>{latestAppointment?.healthData?.bloodPressure || '--'}</p>
        </div>

        {/* Temp */}
        <div className='bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm border-b-4 border-b-orange-500'>
          <div className='flex items-center gap-3 mb-4'>
            <RiTempHotLine className='text-orange-500' size={18} />
            <span className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Temp</span>
          </div>
          <p className='text-3xl font-black text-slate-900'>{latestAppointment?.healthData?.temperature || '--'} <span className='text-xs text-slate-400'>°C</span></p>
        </div>
      </div>

      {/* --- DETAILS SECTION --- */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8'>
        
        {/* Contact Info */}
        <div className='bg-white p-6 md:p-8 rounded-[35px] border border-slate-100 shadow-sm'>
          <h2 className='text-[10px] font-black text-teal-600 uppercase tracking-[3px] mb-6'>Contact Details</h2>
          <div className='space-y-4'>
            <div>
              <p className='text-[9px] font-black text-slate-300 uppercase'>Mobile</p>
              <p className='text-base font-bold text-slate-800'>{userData.phone}</p>
            </div>
            <div>
              <p className='text-[9px] font-black text-slate-300 uppercase'>Clinic Address</p>
              <p className='text-sm font-medium text-slate-600 leading-relaxed'>
                {userData.address.line1}, {userData.address.line2}
              </p>
            </div>
          </div>
        </div>

        {/* Medication Tracking */}
        <div className='bg-white p-6 md:p-8 rounded-[35px] border border-slate-100 shadow-sm'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-[10px] font-black text-teal-600 uppercase tracking-[3px]'>Prescriptions</h2>
            <button onClick={() => navigate('/medication-history')} className='text-[9px] font-black text-slate-400 flex items-center gap-1 hover:text-teal-600 uppercase transition-all'>
              History <RiArrowRightSLine size={14} />
            </button>
          </div>

          <div className='space-y-3'>
            {latestAppointment?.healthData?.prescribedMedicines?.slice(0, 2).map((med, idx) => (
              <div key={idx} className='flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100'>
                <div className='flex items-center gap-3'>
                  <RiMedicineBottleLine className='text-teal-500' size={16} />
                  <div>
                    <p className='text-xs font-black text-slate-800'>{med.name}</p>
                    <p className='text-[9px] text-slate-400 font-bold uppercase'>{med.dosagePerDay} Doses Daily</p>
                  </div>
                </div>
                <div className='bg-white px-2 py-1 rounded-lg border border-slate-100 text-[8px] font-black text-teal-600 uppercase'>
                  {med.remainingQuantity} Unit
                </div>
              </div>
            )) || <p className='text-slate-400 text-xs italic'>Syncing health records...</p>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default MyProfile