import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext.js'
import { DoctorContext } from '../../context/DoctorContext.js'
import axios from 'axios'
import { toast } from 'sonner'
import type { DoctorContextType, AppContextType, Doctor } from '../../types/index.js'

const DoctorProfile: React.FC = () => {
  const { dToken, profileData, getProfileData, backendUrl } = useContext(DoctorContext) as DoctorContextType
  const { currency } = useContext(AppContext) as AppContextType

  const [isEdit, setIsEdit] = useState<boolean>(false)
  // Initialize tempData as null, but we will handle the fallback logic safely
  const [tempData, setTempData] = useState<Doctor | null>(null)

  // Sync local state when profileData changes
  useEffect(() => {
    if (profileData) {
      setTempData(profileData)
    }
  }, [profileData])

  const updateProfile = async () => {
    try {
      if (!tempData) return;

      const payload = {
        address: tempData.address,
        fees: tempData.fees,
        available: tempData.available
      }

      const { data } = await axios.post(
        `${backendUrl}/api/doctor/update-profile`,
        payload,
        { headers: { dtoken: dToken } }
      )

      if (data.success) {
        toast.success(data.message)
        setIsEdit(false)
        await getProfileData()
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  useEffect(() => {
    if (profileData && !isEdit) {
      setTempData(profileData)
    }
  }, [profileData, isEdit])

  // CRITICAL FIX: If we are editing but tempData isn't ready, fallback to profileData 
  // so the screen doesn't go white.
  const displayData = ((isEdit && tempData) ? tempData : profileData) as Doctor;

  // Basic guard: only return null if we have absolutely no data at all
  if (!profileData) return null;

  return (
    <div className='p-4 sm:p-10 bg-slate-50/50 min-h-screen'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex flex-col md:flex-row gap-8 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100'>

          <div className='w-full md:w-64'>
            <img className='bg-primary/10 w-full aspect-square object-cover rounded-3xl' src={displayData.image} alt="" />
          </div>

          <div className='flex-1'>
            <h1 className='text-3xl font-black text-slate-900'>{displayData.name}</h1>
            <p className='text-slate-500 font-bold'>{displayData.degree} — {displayData.speciality}</p>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 pt-8 border-t border-slate-50'>

              {/* --- Fees --- */}
              <div>
                <p className='text-xs font-black uppercase text-slate-400 mb-2'>Appointment Fee</p>
                <div className='flex items-center gap-2 text-xl font-black text-slate-900'>
                  <span>{currency}</span>
                  {isEdit && tempData ? (
                    <input
                      className='w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary'
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
              <div>
                <p className='text-xs font-black uppercase text-slate-400 mb-2'>Practice Address</p>
                {isEdit && tempData ? (
                  <div className='flex flex-col gap-2'>
                    <input
                      className='bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none'
                      type="text"
                      onChange={(e) => setTempData({ ...tempData, address: { ...tempData.address, line1: e.target.value } })}
                      value={tempData.address.line1}
                    />
                    <input
                      className='bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none'
                      type="text"
                      onChange={(e) => setTempData({ ...tempData, address: { ...tempData.address, line2: e.target.value } })}
                      value={tempData.address.line2}
                    />
                  </div>
                ) : (
                  <div className='text-sm text-slate-600 font-medium'>
                    <p>{profileData.address.line1}</p>
                    <p>{profileData.address.line2}</p>
                  </div>
                )}
              </div>
            </div>

            {/* --- Availability --- */}
            <div className='flex items-center gap-3 mt-8 p-4 bg-slate-50 rounded-2xl w-fit'>
              <input
                className='w-5 h-5 accent-primary cursor-pointer'
                onChange={() => isEdit && tempData && setTempData({ ...tempData, available: !tempData.available })}
                checked={isEdit && tempData ? tempData.available : profileData.available}
                type="checkbox"
                id='available'
              />
              <label htmlFor="available" className='text-sm font-bold text-slate-700 cursor-pointer'>
                Accepting New Patients
              </label>
            </div>

            <div className='mt-10'>
              {isEdit ? (
                <div className='flex gap-3'>
                  <button onClick={updateProfile} className='bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[2px] shadow-lg shadow-primary/20 hover:scale-105 transition-transform'>Save</button>
                  <button onClick={() => { setIsEdit(false); setTempData(profileData); }} className='bg-slate-200 text-slate-600 px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[2px]'>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setIsEdit(true)} className='bg-slate-900 text-white px-10 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[2px] shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform'>Edit Profile</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorProfile