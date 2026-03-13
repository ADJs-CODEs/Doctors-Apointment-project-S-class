import React from 'react'
import { assets } from '../../assets/assets/assets_admin/assets'
import { useState } from 'react'
import { useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import axios from 'axios'


const AddDoctor = () => {

  const [docImg, setDocImg] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [experience, setExperience] = useState('1year')
  const [fee, setFee] = useState('')
  const [about, setAbout] = useState('')
  const [speciality, setSpeciality] = useState('General physician')
  const [degree, setDegree] = useState('')
  const [adress1, setAdress1] = useState('')
  const [adress2, setAdress2] = useState('')

  const { backendUrl, aToken } = useContext(AdminContext)

  const onSubmitHandler = async (event) => {
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
      formData.append('fees', Number(fee))
      formData.append('about', about)
      formData.append('address', JSON.stringify({ line1: adress1, line2: adress2 }))
      formData.append('available', true)

      // console log formdata

      formData.forEach((value, key) => {
        console.log(`${key}: ${value}`)
      })

      const { data } = await axios.post(backendUrl + '/api/admin/add-doctor', formData, { headers: { aToken } })
      if (data.success) {
        toast.success(data.message)
        setDocImg(false)
        setName('')
        setEmail('')
        setPassword('')
        setAbout('')
        setAdress1('')
        setAdress2('')
        setFee('')
        setDegree('')
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
      console.log(error)
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='m-5 w-full '>

      <p className='mb-3 text-lg font-medium '>Add Doctor</p>

      <div className='bg-white px-8 py-8 border rounded w-full max-w-4xl max-h-[80vh]  overflow-scroll'>
        <div className='flex items-center gap-4 mb-8 text-gray-500'>
          <label htmlFor="doc-img">
            <img className='w-16 bg-gray-100 rounded-full cursor-pointer ' src={docImg ? URL.createObjectURL(docImg) : assets.upload_area} alt="" />
          </label>
          <input onChange={(e) => setDocImg(e.target.files[0])} type="file" id="doc-img" hidden />
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
                <option value="1year">1year</option>
                <option value="2year">2years</option>
                <option value="3year">3years</option>
                <option value="4year">4years</option>
                <option value="5year">5years</option>
                <option value="6year">6years</option>
                <option value="7year">7years</option>
                <option value="8year">8years</option>
                <option value="9year">9years</option>
                <option value="10year">10years</option>
              </select>
            </div>

            <div className='flex-1 flex flex-col gap-1'>
              <p>Fees</p>
              <input value={fee} onChange={(e) => setFee(e.target.value)} className='border rounded px-3 py-2' type="number" placeholder='Fee' required />
            </div>

          </div>

          <div className='w-full lg:flex-1 flex-col gap-4'>

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

            <div>
              <p>Address</p>
              <input value={adress1} onChange={(e) => setAdress1(e.target.value)} className='border rounded px-3 py-2' type="text" placeholder='address 1' required />
              <input value={adress2} onChange={(e) => setAdress2(e.target.value)} className='border rounded px-3 py-2' type="text" placeholder='address 2' required />
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
