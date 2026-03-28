import React, { useContext, useState } from 'react'
import { assets } from '../../assets/assets/assets_admin/assets.js'
import { AdminContext } from '../../context/AdminContext.js'
import { AppContext } from '../../context/AppContext.js' // Added for progress
import { toast } from 'sonner'
import axios from 'axios'
import { RiUserAddLine, RiImageAddLine, RiMapPin2Line, RiGraduationCapLine } from '@remixicon/react'
import type { AdminContextType, AppContextType } from '../../types/index.js'

const AddDoctor: React.FC = () => {
  const [docImg, setDocImg] = useState<File | false>(false)
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [experience, setExperience] = useState<string>('1 year')
  const [fee, setFee] = useState<string>('')
  const [about, setAbout] = useState<string>('')
  const [speciality, setSpeciality] = useState<string>('General physician')
  const [degree, setDegree] = useState<string>('')
  const [address1, setAddress1] = useState<string>('')
  const [address2, setAddress2] = useState<string>('')

  const { backendUrl, aToken } = useContext(AdminContext) as AdminContextType
  const { setProgress } = useContext(AppContext) as AppContextType

  const onSubmitHandler = async (event: React.BaseSyntheticEvent) => {
    event.preventDefault()
    setProgress(30) // Start progress bar
    try {
      if (!docImg) {
        setProgress(0)
        return toast.error('Image Not Selected')
      }

      const formData = new FormData()
      formData.append('image', docImg)
      formData.append('name', name)
      formData.append('email', email)
      formData.append('password', password)
      formData.append('speciality', speciality)
      formData.append('degree', degree)
      formData.append('experience', experience)
      formData.append('fees', Number(fee).toString())
      formData.append('about', about)
      formData.append('address', JSON.stringify({ line1: address1, line2: address2 }))
      formData.append('available', 'true')

      setProgress(60)
      const { data } = await axios.post(backendUrl + '/api/admin/add-doctor', formData, { headers: { aToken } })

      if (data.success) {
        toast.success(data.message)
        setDocImg(false); setName(''); setEmail(''); setPassword(''); setAbout('')
        setAddress1(''); setAddress2(''); setFee(''); setDegree('')
        setExperience('1 year'); setSpeciality('General physician')
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProgress(100) // Complete progress bar
    }
  }

  return (
    /* Responsive Padding: p-4 on mobile, p-6 on tablet, p-10 on desktop */
    <div className='p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal'>
      <div className='max-w-5xl mx-auto'>

        {/* Header Section: Adjusted margins for mobile */}
        <div className='mb-6 md:mb-10'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='p-2 sm:p-3 bg-slate-900 rounded-xl sm:rounded-2xl text-teal-400'>
              <RiUserAddLine size={20} className='sm:w-6 sm:h-6' />
            </div>
            <h1 className='text-xl sm:text-3xl font-black text-slate-900 leading-tight'>
              Onboard <span className='text-teal-500 font-serif italic normal-case'>New Doctor</span>
            </h1>
          </div>
          <p className='text-slate-500 text-xs sm:text-sm font-medium ml-12 sm:ml-14'>
            Enter professional credentials to create a new medical profile.
          </p>
        </div>

        {/* Responsive Grid: Stacks on mobile/tablet (grid-cols-1), original lg:grid-cols-3 on desktop */}
        <form onSubmit={onSubmitHandler} className='grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 items-start'>

          {/* Left Column: Image Upload & Bio */}
          <div className='lg:col-span-1 space-y-6 md:space-y-8'>
            <div className='bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-portal border border-slate-100 flex flex-col items-center text-center'>
              <label htmlFor="doc-img" className='relative group cursor-pointer'>
                <div className='w-32 h-32 sm:w-40 sm:h-40 rounded-[28px] sm:rounded-[32px] overflow-hidden bg-slate-50 border-4 border-white shadow-xl group-hover:scale-95 transition-all duration-500'>
                  <img
                    className='w-full h-full object-cover'
                    src={docImg ? URL.createObjectURL(docImg) : assets.upload_area}
                    alt=""
                  />
                </div>
                <div className='absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-teal-500 text-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-neon group-hover:rotate-12 transition-transform'>
                  <RiImageAddLine size={18} className='sm:w-5 sm:h-5' />
                </div>
              </label>
              <p className='mt-4 sm:mt-6 text-[9px] sm:text-[10px] font-black uppercase tracking-[2px] text-slate-400'>Profile Photograph</p>
              <input onChange={(e) => e.target.files && setDocImg(e.target.files?.[0] || false)} type="file" id="doc-img" hidden />
            </div>

            <div className='bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-portal border border-slate-100'>
              <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-4'>Professional Biography</p>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className='admin-input min-h-[150px] sm:min-h-[200px] resize-none text-sm'
                placeholder='Detailed medical background...'
                required
              />
            </div>
          </div>

          {/* Right Column: Technical Details */}
          <div className='lg:col-span-2 bg-white p-6 sm:p-10 md:p-14 rounded-[40px] sm:rounded-[56px] shadow-portal border border-slate-100'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 sm:gap-y-6'>

              <div className='space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2'>Full Name</p>
                <input value={name} onChange={(e) => setName(e.target.value)} className='admin-input' type="text" placeholder='Dr. John Doe' required />
              </div>

              <div className='space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2'>Email Address</p>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className='admin-input' type="email" placeholder='doctor@serene.com' required />
              </div>

              <div className='space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2'>Secure Password</p>
                <input value={password} onChange={(e) => setPassword(e.target.value)} className='admin-input' type="password" placeholder='••••••••' required />
              </div>

              <div className='space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2'>Clinical Speciality</p>
                <select value={speciality} onChange={(e) => setSpeciality(e.target.value)} className='admin-input appearance-none'>
                  <option value="General physician">General physician</option>
                  <option value="Gynecologist">Gynecologist</option>
                  <option value="Dermatologist">Dermatologist</option>
                  <option value="Pediatricians">Pediatricians</option>
                  <option value="Neurologist">Neurologist</option>
                  <option value="Gastroenterologist">Gastroenterologist</option>
                </select>
              </div>

              <div className='space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2'>Experience</p>
                <select value={experience} onChange={(e) => setExperience(e.target.value)} className='admin-input appearance-none'>
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={`${i + 1} year`}>{i + 1} Year{i > 0 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div className='space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2'>Consultation Fee</p>
                <input value={fee} onChange={(e) => setFee(e.target.value)} className='admin-input' type="number" placeholder='0.00' required />
              </div>

              <div className='md:col-span-2 space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2 flex items-center gap-2'>
                  <RiGraduationCapLine size={12} /> Academic Degree
                </p>
                <input value={degree} onChange={(e) => setDegree(e.target.value)} className='admin-input' type="text" placeholder='MBBS, MD - Cardiology' required />
              </div>

              <div className='md:col-span-2 space-y-4 pt-4 border-t border-slate-50'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2 flex items-center gap-2'>
                  <RiMapPin2Line size={12} /> Practice Location
                </p>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <input value={address1} onChange={(e) => setAddress1(e.target.value)} className='admin-input' type="text" placeholder='Street Address Line 1' required />
                  <input value={address2} onChange={(e) => setAddress2(e.target.value)} className='admin-input' type="text" placeholder='City/State Line 2' required />
                </div>
              </div>

            </div>

            {/* Tactile Register Button: Optimized for mobile touch */}
            <button type='submit' className='w-full bg-slate-900 text-white font-black uppercase tracking-[3px] text-[10px] sm:text-xs py-4 sm:py-5 rounded-2xl sm:rounded-3xl mt-8 md:mt-12 hover:bg-teal-500 hover:shadow-neon transition-all duration-300 transform active:scale-95'>
              Register Professional Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddDoctor