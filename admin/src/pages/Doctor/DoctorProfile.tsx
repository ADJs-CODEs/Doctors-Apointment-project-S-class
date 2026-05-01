import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext.js'
import { DoctorContext } from '../../context/DoctorContext.js'
import { toast } from 'sonner'
import type { DoctorContextType, AppContextType, Doctor } from '../../types/index.js'
import axiosInstance from '../../utils/axiosInstance.js'
import { API_PATHS } from '../../utils/apiPath.js'
import Availabilty from '../../inputs/Availabilty.js'

const DoctorProfile: React.FC = () => {
  const { profileData, getProfileData } = useContext(DoctorContext) as DoctorContextType
  const { currency, setProgress } = useContext(AppContext) as AppContextType

  const [isEdit, setIsEdit] = useState<boolean>(false)
  const [tempData, setTempData] = useState<Doctor | null>(null)

  useEffect(() => {
    if (profileData) {
      setTempData(profileData)
    }
  }, [profileData])

  const updateProfile = async () => {
    try {
      if (!tempData) return;

      setProgress(30); // Start progress
      const payload = {
        address: tempData.address,
        fees: tempData.fees,
        available: tempData.available
      }

      const { data } = await axiosInstance.post(API_PATHS.AUTH.GET_PROFILE, payload)

      if (data.success) {
        setProgress(70);
        toast.success(data.message)
        setIsEdit(false)
        await getProfileData()
        setProgress(100); // Complete progress
      } else {
        setProgress(100);
        toast.error(data.message)
      }
    } catch (error: any) {
      setProgress(100);
      toast.error(error.response?.data?.message || error.message)
    }
  }

  useEffect(() => {
    if (profileData && !isEdit) {
      setTempData(profileData)
    }
  }, [profileData, isEdit])

  const displayData = ((isEdit && tempData) ? tempData : profileData) as Doctor;

  if (!profileData) return null;

  return (
    <div className='p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex flex-col md:flex-row gap-6 md:gap-8 bg-white p-6 sm:p-8 md:p-10 rounded-4xl md:rounded-[40px] shadow-sm border border-slate-100'>

          {/* Image Container - Responsive si*/}
          <div className='w-full md:w-64 flex justify-center md:block'>
            <img className='bg-primary/10 w-48 h-48 sm:w-64 sm:h-64 md:w-full md:h-auto aspect-square object-cover rounded-3xl shadow-inner' src={displayData.image.replace('/upload/', '/upload/f_jpg,q_auto:best/')} alt="" />
          </div>

          <div className='flex-1 text-center md:text-left'>
            <h1 className='text-2xl sm:text-3xl font-black text-slate-900'>{displayData.name}</h1>
            <p className='text-slate-500 font-bold text-sm sm:text-base'>{displayData.degree} — {displayData.speciality}</p>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-slate-50 text-left'>

              {/* --- Fees --- */}
              <div className='active:scale-[0.98] transition-transform'>
                <p className='text-[10px] font-black uppercase text-slate-400 mb-2 tracking-wider'>Appointment Fee</p>
                <div className='flex items-center gap-2 text-xl font-black text-slate-900'>
                  <span>{currency}</span>
                  {isEdit && tempData ? (
                    <input
                      className='w-full sm:w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all'
                      type="number"
                      onChange={(e) => setTempData({ ...tempData, fees: Number(e.target.value) })}
                      value={tempData.fees}
                    />
                  ) : (
                    <span>{profileData.fees}</span>
                  )}
                </div>
              </div>

              {/* --- Address --- */}
              <div className='active:scale-[0.98] transition-transform'>
                <p className='text-[10px] font-black uppercase text-slate-400 mb-2 tracking-wider'>Practice Address</p>
                {isEdit && tempData ? (
                  <div className='flex flex-col gap-2'>
                    <input
                      className='w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all'
                      type="text"
                      onChange={(e) => setTempData({ ...tempData, address: { ...tempData.address, line1: e.target.value } })}
                      value={tempData.address.line1}
                    />
                    <input
                      className='w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all'
                      type="text"
                      onChange={(e) => setTempData({ ...tempData, address: { ...tempData.address, line2: e.target.value } })}
                      value={tempData.address.line2}
                    />
                  </div>
                ) : (
                  <div className='text-sm text-slate-600 font-medium leading-relaxed'>
                    <p>{profileData.address.line1}</p>
                    <p>{profileData.address.line2}</p>
                  </div>
                )}
              </div>
            </div>

            {/* --- Availability --- */}
            <Availabilty
              isEdit={isEdit}
              tempData={isEdit}
              setTempData={isEdit}
              profileData={isEdit}
            />
            <div className='mt-8 md:mt-10 flex flex-col sm:flex-row gap-3'>
              {isEdit ? (
                <>
                  <button onClick={updateProfile} className='w-full sm:w-auto bg-teal-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-[2px] shadow-lg shadow-teal-500/20 active:scale-95 transition-all'>Save Changes</button>
                  <button onClick={() => { setIsEdit(false); setTempData(profileData); }} className='w-full sm:w-auto bg-slate-200 text-slate-600 px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-[2px] active:scale-95 transition-all'>Cancel</button>
                </>
              ) : (
                <button onClick={() => setIsEdit(true)} className='w-full sm:w-auto bg-slate-900 text-white px-10 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-[2px] shadow-lg shadow-slate-900/20 active:scale-95 transition-all'>Edit Profile</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorProfile