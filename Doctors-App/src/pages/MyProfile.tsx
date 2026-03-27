import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { toast } from 'sonner'
import axios from 'axios'
import type { AppContextType, Appointment } from '../types/index.js'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom' // --- ADDED ---
import { RiHeartPulseLine, RiDashboardLine, RiTempHotLine, RiMedicineBottleLine, RiArrowRightSLine } from "@remixicon/react"

const MyProfile: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { userData, setUserData, token, backendUrl, loadUserProfileData, setProgress } = context;
  const navigate = useNavigate(); // --- ADDED ---

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
      image && formData.append('image', image)

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

  return userData && token && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='max-w-4xl mx-auto p-4 py-12 relative z-10'
    >
      {/* --- Header Section --- */}
      <div className='glass-card-premium p-8 rounded-[40px] flex flex-col md:flex-row items-center gap-8 mb-10'>
        <div className='relative shrink-0 group'>
          <div className='w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-xl relative z-10 ring-1 ring-slae-100'>
            {isEdit ? (
              <label htmlFor="image" className="cursor-pointer group relative block h-full w-full bg-slate-100">
                <img className='w-full h-full object-cover opacity-50 bg-white' src={image ? URL.createObjectURL(image) : userData.image} alt="" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-100">
                  <img className="w-10 invert" src={assets.upload_icon} alt="" />
                </div>
                <input onChange={(e) => setImage(e.target.files ? e.target.files[0] : false)} type='file' id='image' hidden />
              </label>
            ) : (
              <img className='w-full h-full object-cover rounded-full bg-white transform-gpu'
              style={{ backfaceVisibility: 'hidden', imageRendering: 'auto' }}
               src={userData.image} alt="" />
            )}
          </div>
        </div>

        <div className='flex-1 text-center md:text-left'>
          {isEdit ? (
            <input
              className='bg-white border border-slate-200 text-slate-900 text-4xl font-bold px-4 py-2 rounded-2xl outline-none focus:border-teal/50 w-full'
              value={userData.name}
              onChange={e => setUserData((prev: any) => ({ ...prev, name: e.target.value }))}
            />
          ) : (
            <>
              <h1 className='text-4xl font-extrabold text-slate-900 tracking-tight'>{userData.name}</h1>
              <div className='mt-2 inline-flex items-center px-4 py-1.5 rounded-full bg-teal/10 text-teal text-[10px] font-bold uppercase tracking-widest border border-teal/20'>
                Verified Patient
              </div>
            </>
          )}
          <p className='text-slate-500 mt-3 font-medium'>{userData.email}</p>
        </div>

        <button
          onClick={isEdit ? updateUserProfileData : () => setIsEdit(true)}
          className={`${isEdit ? 'bg-teal text-white' : 'bg-white border border-slate-200 text-slate-900'} px-10 py-4 rounded-2xl font-bold shadow-sm hover:scale-95 transition-all`}
        >
          {isEdit ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      {/* --- VITALS SECTION --- */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-10'>
        <div className='glass-card-premium p-6 rounded-[35px] border-b-4 border-rose-500'>
          <div className='flex items-center gap-3 mb-3'>
            <RiHeartPulseLine className='text-rose-500' size={20} />
            <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>Heart Rate</p>
          </div>
          <p className='text-3xl font-black text-slate-900'>
            {latestAppointment?.healthData?.heartRate || '--'} <span className='text-xs text-slate-400 font-bold'>BPM</span>
          </p>
        </div>

        <div className='glass-card-premium p-6 rounded-[35px] border-b-4 border-blue-500'>
          <div className='flex items-center gap-3 mb-3'>
            <RiDashboardLine className='text-blue-500' size={20} />
            <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>Blood Pressure</p>
          </div>
          <p className='text-3xl font-black text-slate-900'>
            {latestAppointment?.healthData?.bloodPressure || '--'}
          </p>
        </div>

        <div className='glass-card-premium p-6 rounded-[35px] border-b-4 border-orange-500'>
          <div className='flex items-center gap-3 mb-3'>
            <RiTempHotLine className='text-orange-500' size={20} />
            <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>Temperature</p>
          </div>
          <p className='text-3xl font-black text-slate-900'>
            {latestAppointment?.healthData?.temperature || '--'} <span className='text-xs text-slate-400 font-bold'>°C</span>
          </p>
        </div>
      </div>

      <div className='grid md:grid-cols-2 gap-8'>
        {/* Contact Info */}
        <div className='glass-card-premium p-8 rounded-[40px]'>
          <h2 className='text-[10px] font-black text-teal uppercase tracking-[3px] mb-8'>Contact Information</h2>
          <div className='space-y-6'>
            <div>
              <p className='text-[10px] font-bold text-slate-400 uppercase mb-1'>Phone</p>
              <p className='text-lg font-bold text-slate-800'>{userData.phone}</p>
            </div>
            <div>
              <p className='text-[10px] font-bold text-slate-400 uppercase mb-1'>Address</p>
              <p className='text-lg font-bold text-slate-800 leading-tight'>
                {userData.address.line1}<br />{userData.address.line2}
              </p>
            </div>
          </div>
        </div>

        {/* Medications Section with Navigation */}
        <div className='glass-card-premium p-8 rounded-[40px]'>
          <div className='flex justify-between items-center mb-8'>
            <h2 className='text-[10px] font-black text-teal uppercase tracking-[3px]'>Current Medications</h2>
            {/* --- NAVIGATION BUTTON --- */}
            <button
              onClick={() => navigate('/medication-history')}
              className='group flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-teal uppercase transition-all'
            >
              See All
              <RiArrowRightSLine size={14} className='group-hover:translate-x-1 transition-transform' />
            </button>
          </div>

          <div className='space-y-3'>
            {latestAppointment?.healthData?.prescribedMedicines?.map((med, idx) => (
              <div
                key={idx}
                onClick={() => navigate('/medication-history')}
                className='bg-white/60 border border-slate-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white hover:shadow-md hover:border-teal/20 transition-all group'
              >
                <div className='flex items-center gap-3'>
                  <RiMedicineBottleLine className='text-teal-500 group-hover:scale-110 transition-transform' size={18} />
                  <div>
                    <p className='text-sm font-black text-slate-800'>{med.name}</p>
                    <p className='text-[10px] text-slate-500 font-bold uppercase'>{med.dosagePerDay} Doses / Day</p>
                  </div>
                </div>
                <p className='text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-md'>{med.remainingQuantity} LEFT</p>
              </div>
            )) || <p className='text-slate-400 italic text-sm'>No active prescriptions.</p>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default MyProfile