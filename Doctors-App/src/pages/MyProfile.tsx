import React, { useContext, useState } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { toast } from 'sonner'
import axios from 'axios'
import type { AppContextType } from '../types/index.js'
import { motion } from 'framer-motion'

const MyProfile: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { userData, setUserData, token, backendUrl, loadUserProfileData, setProgress } = context;

  const [isEdit, setIsEdit] = useState<boolean>(false)
  const [image, setImage] = useState<File | false | undefined>(false)

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
      setProgress(70)

      if (data.success) {
        toast.success(data.message)
        setTimeout(async () => {
          await loadUserProfileData()
          setIsEdit(false);
          setImage(false);
        }, 500)
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProgress(100)
    }
  }

  return userData && token && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='max-w-4xl mx-auto p-4 py-12 relative z-10'
    >
      {/* --- Header Section --- */}
      <div className='glass-card p-8 rounded-[40px] flex flex-col md:flex-row items-center gap-8 mb-10'>

        {/* Profile Image with Mint Neon Glow */}
        <div className='relative shrink-0 group'>
          <div className='absolute -inset-2 bg-electric-grad rounded-full blur-xl opacity-30 group-hover:opacity-60 transition duration-500' />
          <div className='w-40 h-40 rounded-full overflow-hidden border-4 border-dark-bg shadow-2xl relative z-10 bg-dark-card'>
            {isEdit ? (
              <label htmlFor="image" className="cursor-pointer group relative block h-full w-full">
                <img className='w-full h-full object-cover transition-opacity group-hover:opacity-50' src={image ? URL.createObjectURL(image) : userData.image} alt="" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                  <img className="w-10 invert" src={assets.upload_icon} alt="" />
                </div>
                <input onChange={(e) => setImage(e.target.files ? e.target.files[0] : false)} type='file' id='image' hidden />
              </label>
            ) : (
              <img className='w-full h-full object-cover' src={userData.image} alt="" />
            )}
          </div>
        </div>

        {/* Name & Account Type */}
        <div className='flex-1 text-center md:text-left'>
          {isEdit ? (
            <input
              className='bg-white/5 border border-white/10 text-white text-4xl font-bold px-4 py-2 rounded-2xl outline-none focus:border-mint/50 transition-all w-full max-w-lg'
              value={userData.name}
              onChange={e => setUserData((prev: any) => prev ? ({ ...prev, name: e.target.value }) : false)}
            />
          ) : (
            <>
              <h1 className='text-4xl font-extrabold text-white tracking-tight leading-tight'>{userData.name}</h1>
              <div className='mt-2 inline-flex items-center px-4 py-1.5 rounded-full bg-mint/10 text-mint text-[10px] font-bold uppercase tracking-widest border border-mint/20'>
                Verified Account
              </div>
            </>
          )}
          <p className='text-slate-500 mt-3 font-medium tracking-wide'>{userData.email}</p>
        </div>

        {/* Action Button */}
        <div className='shrink-0'>
          {isEdit ? (
            <button onClick={updateUserProfileData} className='bg-electric-grad text-dark-bg px-10 py-4 rounded-2xl font-bold shadow-neon hover:brightness-110 active:scale-95 transition-all'>
              Save Changes
            </button>
          ) : (
            <button onClick={() => setIsEdit(true)} className='bg-white/5 border border-white/10 text-white px-10 py-4 rounded-2xl font-bold hover:bg-white/10 active:scale-95 transition-all backdrop-blur-md'>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* --- Info Grid --- */}
      <div className='grid md:grid-cols-2 gap-8'>

        {/* Contact Info */}
        <motion.div whileHover={{ y: -5 }} className='glass-card p-8 rounded-[40px]'>
          <h2 className='text-xs font-bold text-mint tracking-[3px] uppercase mb-8 opacity-90'>Contact Information</h2>
          <div className='space-y-8'>
            <div>
              <p className='text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2'>Phone Number</p>
              {isEdit ? (
                <input className='w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-mint/50 transition-all' value={userData.phone} onChange={e => setUserData((prev: any) => prev ? ({ ...prev, phone: e.target.value }) : false)} />
              ) : (
                <p className='text-lg font-semibold text-slate-200'>{userData.phone}</p>
              )}
            </div>
            <div>
              <p className='text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2'>Street Address</p>
              {isEdit ? (
                <div className='space-y-3'>
                  <input className='w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-mint/50' value={userData.address.line1} onChange={e => setUserData((prev: any) => prev ? ({ ...prev, address: { ...prev.address, line1: e.target.value } }) : false)} />
                  <input className='w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-mint/50' value={userData.address.line2} onChange={e => setUserData((prev: any) => prev ? ({ ...prev, address: { ...prev.address, line2: e.target.value } }) : false)} />
                </div>
              ) : (
                <p className='text-lg font-semibold text-slate-200 leading-relaxed'>{userData.address.line1}<br />{userData.address.line2}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* General Details */}
        <motion.div whileHover={{ y: -5 }} className='glass-card p-8 rounded-[40px]'>
          <h2 className='text-xs font-bold text-mint tracking-[3px] uppercase mb-8 opacity-90'>General Details</h2>
          <div className='space-y-8'>
            <div>
              <p className='text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2'>Gender</p>
              {isEdit ? (
                <select className='w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-mint/50 appearance-none' value={userData.gender} onChange={(e: any) => setUserData((prev: any) => prev ? ({ ...prev, gender: e.target.value }) : false)}>
                  <option className="bg-dark-card" value="Male">Male</option>
                  <option className="bg-dark-card" value="Female">Female</option>
                </select>
              ) : (
                <p className='text-lg font-semibold text-slate-200'>{userData.gender}</p>
              )}
            </div>
            <div>
              <p className='text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2'>Date of Birth</p>
              {isEdit ? (
                <input className='w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-mint/50' type="date" value={userData.dob} onChange={(e) => setUserData((prev: any) => prev ? ({ ...prev, dob: e.target.value }) : false)} />
              ) : (
                <p className='text-lg font-semibold text-slate-200'>{userData.dob}</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default MyProfile