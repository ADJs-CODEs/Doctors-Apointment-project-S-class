import React, { useContext, useState } from 'react'
import { assets } from '../../assets/assets/assets_admin/assets.js'
import { AdminContext } from '../../context/AdminContext.js'
import { toast } from 'sonner'
import axios from 'axios'
import { RiUserAddLine, RiImageAddLine, RiMapPin2Line, RiGraduationCapLine } from '@remixicon/react'
import type { AdminContextType } from '../../types/index.js'

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

  const onSubmitHandler = async (event: React.BaseSyntheticEvent) => {
    event.preventDefault()
    try {
      if (!docImg) return toast.error('Image Not Selected')

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
    }
  }

  return (
    <div className='p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal'>
      <div className='max-w-5xl mx-auto'>

        {/* Header Section */}
        <div className='mb-10'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='p-3 bg-slate-900 rounded-2xl text-teal-400'>
              <RiUserAddLine size={24} />
            </div>
            <h1 className='text-3xl font-black text-slate-900'>Onboard <span className='text-teal-500 font-serif italic normal-case'>New Doctor</span></h1>
          </div>
          <p className='text-slate-500 font-medium ml-14'>Enter professional credentials to create a new medical profile.</p>
        </div>

        <form onSubmit={onSubmitHandler} className='grid grid-cols-1 lg:grid-cols-3 gap-10 items-start'>

          {/* Left Column: Image Upload & Bio */}
          <div className='lg:col-span-1 space-y-8'>
            <div className='bg-white p-8 rounded-[40px] shadow-portal border border-slate-100 flex flex-col items-center text-center'>
              <label htmlFor="doc-img" className='relative group cursor-pointer'>
                <div className='w-40 h-40 rounded-[32px] overflow-hidden bg-slate-50 border-4 border-white shadow-xl group-hover:scale-95 transition-all duration-500'>
                  <img
                    className='w-full h-full object-cover'
                    src={docImg ? URL.createObjectURL(docImg) : assets.upload_area}
                    alt=""
                  />
                </div>
                <div className='absolute -bottom-2 -right-2 bg-teal-500 text-white p-3 rounded-2xl shadow-neon group-hover:rotate-12 transition-transform'>
                  <RiImageAddLine size={20} />
                </div>
              </label>
              <p className='mt-6 text-[10px] font-black uppercase tracking-[2px] text-slate-400'>Profile Photograph</p>
              <input onChange={(e) => e.target.files && setDocImg(e.target.files?.[0] || false)} type="file" id="doc-img" hidden />
            </div>

            <div className='bg-white p-8 rounded-[40px] shadow-portal border border-slate-100'>
              <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-4'>Professional Biography</p>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className='admin-input min-h-[200px] resize-none'
                placeholder='Detailed medical background...'
                required
              />
            </div>
          </div>

          {/* Right Column: Technical Details */}
          <div className='lg:col-span-2 bg-white p-10 md:p-14 rounded-[56px] shadow-portal border border-slate-100'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6'>

              {/* Row 1 */}
              <div className='space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2'>Full Name</p>
                <input value={name} onChange={(e) => setName(e.target.value)} className='admin-input' type="text" placeholder='Dr. John Doe' required />
              </div>

              <div className='space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2'>Email Address</p>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className='admin-input' type="email" placeholder='doctor@serene.com' required />
              </div>

              {/* Row 2 */}
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

              {/* Row 3 */}
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

              {/* Education & Address Full Width */}
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

            <button type='submit' className='w-full bg-slate-900 text-white font-black uppercase tracking-[3px] text-xs py-5 rounded-3xl mt-12 hover:bg-teal-500 hover:shadow-neon transition-all duration-300 transform active:scale-[0.98]'>
              Register Professional Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddDoctor