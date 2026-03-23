import React, { useContext, useState } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { toast } from 'sonner'
import axios from 'axios'
import type { AppContextType } from '../types/index.js'

const MyProfile: React.FC = () => {


  const context = useContext(AppContext) as AppContextType;
  const { userData, setUserData, token, backendUrl, loadUserProfileData, setProgress } = context;

  const [isEdit, setIsEdit] = useState<boolean>(false)

  // image can be a File object or false
  const [image, setImage] = useState<File | false | undefined>(false)

  const updateUserProfileData = async () => {
    try {
      if (!userData) return; // Guard clause for TypeScript

      setProgress(30)
      const formData = new FormData()
      formData.append('name', userData.name)
      formData.append('phone', userData.phone)
      formData.append('gender', userData.gender)
      formData.append('address', JSON.stringify(userData.address))
      formData.append('dob', userData.dob)

      image && formData.append('image', image)

      console.log("--- FRONTEND SENDING ---");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

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
    }
    catch (error: any) {
      console.log(error)
      toast.error(error.message)
    }
    finally {
      setProgress(100)
    }
  }

  return userData && token && (
    <div className='max-w-lg flex flex-col gap-2 text-sm animate-reveal'>
      {
        isEdit
          ? <label htmlFor='image'>
            <div className='inline-block relative cursor-pointer'>
              <img className='w-36 rounded opacity-75 transition-all' src={image ? URL.createObjectURL(image) : userData.image} alt="" />
              <img className='w-10 absolute bottom-12 group-hover:scale-110 transition-all right-12' src={image ? '' : assets.upload_icon} alt="" />
            </div>
            {/* Added type check for the file input */}
            <input onChange={(e) => setImage(e.target.files ? e.target.files[0] : false)} type='file' id='image' hidden />
          </label>
          : <img className='w-36 rounded' src={userData.image} alt="" />

      }


      {
        isEdit
          ? <input className='bg-gray-50 text-3xl px-2 py-1 rounded font-medium max-w-60 mt-4' value={userData.name} type="text" onChange={e => setUserData((prev: any) => prev ? ({ ...prev, name: e.target.value }) : false)} />
          : <p className='font-medium text-3xl text-neutral-800 mt-4 '>{userData.name}</p>
      }

      <hr className='bg-zinc-400 h-[1px] border-none' />
      <div>
        <p className='text-neutral-500 underline mt-3'>CONTACT INFORMATION</p>
        <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-neutral-700'>
          <p className='font-medium'>Email id: </p>
          <p className='text-blue-500'>{userData.email}</p>
          <p className='font-medium'>Phone:</p>
          {
            isEdit
              ? <input className='bg-gray-100 px-2 py-1 rounded max-w-52' value={userData.phone} type="text" onChange={e => setUserData((prev: any) => prev ? ({ ...prev, phone: e.target.value }) : false)} />
              : <p className='text-blue-400'>{userData.phone}</p>
          }
          <p className='font-medium'>Address:</p>
          {
            isEdit
              ? <p>
                <input className='bg-gray-50 px-2 py-1 rounded' value={userData.address.line1} type="text" onChange={e => setUserData((prev: any) => prev ? ({ ...prev, address: { ...prev.address, line1: e.target.value } }) : false)} />
                <br />
                <input className='bg-gray-50 px-2 py-1 rounded' value={userData.address.line2} type="text" onChange={e => setUserData((prev: any) => prev ? ({ ...prev, address: { ...prev.address, line2: e.target.value } }) : false)} />
              </p>
              : <p className='text-gray-500'>
                {userData.address.line1}
                <br />
                {userData.address.line2}
              </p>
          }

        </div>
      </div>

      <div>
        <p className='text-neutral-500 underline mt-3'>
          BASIC INFORMATION
        </p>
        <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-neutral-700'>
          <p className='font-medium'>Gender:</p>
          {
            isEdit
              ? <select className='max-w-20 bg-gray-100' value={userData.gender} onChange={(e: any) => setUserData((prev: any) => prev ? ({ ...prev, gender: e.target.value }) : false)}>
                <option value="Male">Male</option>
                <option value="Female">Female </option>
              </select>
              : <p className='text-gray-400'>{userData.gender}</p>
          }
          <p className='font-medium'>
            Birthday:
          </p>
          {
            isEdit
              ? <input className='max-w-28 bg-gray-100' value={userData.dob} onChange={(e) => setUserData((prev: any) => prev ? ({ ...prev, dob: e.target.value }) : false)} type="date" />
              : <p className='text-gray-400' >{userData.dob}</p>
          }
        </div >
      </div>

      <div className='mt-10'>
        {
          isEdit
            ? <button className='border border-primary px-8 py-2 rounded-full  hover:bg-primary hover:text-white transition-all' onClick={updateUserProfileData}>Save Information</button>
            : <button className='border border-primary px-8 py-2 rounded-full hover:bg-primary hover:text-white transition-all' onClick={() => setIsEdit(true)}>Edit</button>
        }
      </div>
    </div>
  )
}

export default MyProfile