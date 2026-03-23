import React, { useContext, useState, } from 'react'
import { assets } from '../../assets/assets/assets_admin/assets.js'
import { AdminContext } from '../../context/AdminContext.js'
import { toast } from 'sonner'
import axios from 'axios'
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
      if (!docImg) {
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
      formData.append('fees', Number(fee).toString()) // Append as string for FormData
      formData.append('about', about)
      formData.append('address', JSON.stringify({ line1: address1, line2: address2 }))
      formData.append('available', 'true')

      const { data } = await axios.post(backendUrl + '/api/admin/add-doctor', formData, { headers: { aToken } })

      if (data.success) {
        toast.success(data.message)
        setDocImg(false)
        setName('')
        setEmail('')
        setPassword('')
        setAbout('')
        setAddress1('')
        setAddress2('')
        setFee('')
        setDegree('')
        setExperience('1 year')
        setSpeciality('General physician')
      } else {
        toast.error(data.message)
      }

    } catch (error: any) {
      toast.error(error.message)
      console.log(error)
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='m-5 w-full '>

      <p className='mb-3 text-lg font-medium '>Add Doctor</p>

      <div className='bg-white px-8 py-8 border rounded w-full max-w-4xl max-h-[80vh] overflow-y-scroll'>
        <div className='flex items-center gap-4 mb-8 text-gray-500'>
          <label htmlFor="doc-img">
            <img className='w-16 bg-gray-100 rounded-full cursor-pointer object-cover aspect-square' src={docImg ? URL.createObjectURL(docImg) : assets.upload_area} alt="" />
          </label>
          <input onChange={(e) => e.target.files && setDocImg(e.target.files?.[0] || false)} type="file" id="doc-img" hidden />
          <p>Upload doctor <br />picture</p>
        </div>

        <div className='flex flex-col lg:flex-row items-start gap-10 text-gray-600'>
          <div className='w-full lg:flex-1 flex flex-col gap-4'>

            <div className='flex-1 flex flex-col gap-1'>
              <p>Doctor name</p>
              <input value={name} onChange={(e) => setName(e.target.value)} className='border rounded px-3 py-2' type="text" placeholder='Name' required />
            </div>

            <div className='flex-1 flex flex-col gap-1'>
              <p>Doctor Email</p>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className='border rounded px-3 py-2' type="email" placeholder='Email' required />
            </div>

            <div className='flex-1 flex flex-col gap-1'>
              <p>Doctor Password</p>
              <input value={password} onChange={(e) => setPassword(e.target.value)} className='border rounded px-3 py-2' type="password" placeholder='Password' required />
            </div>

            <div className='flex-1 flex flex-col gap-1'>
              <p>Experience</p>
              <select value={experience} onChange={(e) => setExperience(e.target.value)} className='border rounded px-3 py-2' name="" id="">
                <option value="1 year">1 year</option>
                <option value="2 year">2 years</option>
                <option value="3 year">3 years</option>
                <option value="4 year">4 years</option>
                <option value="5 year">5 years</option>
                <option value="6 year">6 years</option>
                <option value="7 year">7 years</option>
                <option value="8 year">8 years</option>
                <option value="9 year">9 years</option>
                <option value="10 year">10 years</option>
              </select>
            </div>

            <div className='flex-1 flex flex-col gap-1'>
              <p>Fees</p>
              <input value={fee} onChange={(e) => setFee(e.target.value)} className='border rounded px-3 py-2' type="number" placeholder='Fee' required />
            </div>

          </div>

          <div className='w-full lg:flex-1 flex flex-col gap-4'>

            <div className='flex-1 flex flex-col gap-1' >
              <p>Speciality</p>
              <select value={speciality} onChange={(e) => setSpeciality(e.target.value)} className='border rounded px-3 py-2' name="" id="">
                <option value="General physician">General physician</option>
                <option value="Gynecologist">Gynecologist</option>
                <option value="Dermatologist">Dermatologist</option>
                <option value="Pediatricians">Pediatricians</option>
                <option value="Neurologist">Neurologist</option>
                <option value="Gastroenterologist">Gastroenterologist</option>
              </select>
            </div>

            <div className='flex-1 flex flex-col gap-1'>
              <p>Education</p>
              <input value={degree} onChange={(e) => setDegree(e.target.value)} className='border rounded px-3 py-2' type="text" placeholder='Education' required />
            </div>

            <div className='flex-1 flex flex-col gap-1'>
              <p>Address</p>
              <input value={address1} onChange={(e) => setAddress1(e.target.value)} className='border rounded px-3 py-2' type="text" placeholder='address 1' required />
              <input value={address2} onChange={(e) => setAddress2(e.target.value)} className='border rounded px-3 py-2' type="text" placeholder='address 2' required />
            </div>

          </div>
        </div>

        <div>
          <p className='mt-4 mb-2'>About Doctor</p>
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} className='w-full px-4 pt-2 border rounded' placeholder='write about doctor' rows={5} required />
        </div>

        <button type='submit' className='bg-primary px-10 py-3 mt-4 text-white rounded-full'>Add doctor </button>
      </div>
    </form >
  )
}

export default AddDoctor