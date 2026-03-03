import React from 'react'
import { assets } from '../assets/assets_frontend/assets'

const About = () => {
  return (

    <div>

      <div className='text-center text-2xl pt-20 text-gray-500'>
        <p>ABOUT <span className='text-gray-700 font-medium'>US</span></p>
      </div>

      <div className='my-10 flex flex-col md:flex-row gap-12'>
        <img className='w-full md:max-w-[360px]' src={assets.about_image} alt="" />
        <div className='flex flex-col gap-6 justify-center md:w-2/4 text- sm text-gray-600'>
          <p>Welcome to prescripto,your trusted partner in managing your healthcare needs conveniently and efficiently.At prescripto, we understand the challenges patients face when it comes to scheduling appointments and managing their health records.</p>
          <p>Prescripto is committed to Excellence in HealthCare Technology, we continuously strive to enhance our platform integrating the latest advancemets to improve user experience and deliver superior service wether you're booking your first appointment or managing ongoing care. Prescripto is here to support you every step of the way.  </p>
          <b className='text-gray-800'>Our Vision</b>
          <p>Our Vision at presripto is to create a seamless health care experience for every user. we aim to bridge the gap between patients and healthcare providers, making it easier for you to access the care you need, when you need it.</p>
        </div>
      </div>

      <div>
        <p>WHY <span className='text-gray-700 font-semibold'>CHOOSE US</span></p>
      </div>

      <div className='flex flex-col md:flex-row mb-20'>
        <div className='border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duraton-300 text-gray-600 cursor-pointer'>
          <b>Efficiency:</b>
          <p>Streamlined appointment scheduling that fits into your busy lifestyle.</p>
        </div>
        <div className='border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duraton-300 text-gray-600 cursor-pointer'>
          <b>Convenience:</b>
          <p>Access to a network of trusted healthcare professionals in your area</p>
        </div>
        <div className='border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duraton-300 text-gray-600 cursor-pointer'>
          <b>Personalization:</b>
          <p>Tailored recommendations and reminders to help you stay on top of your health.</p>
        </div>
      </div>


    </div>
  )
}

export default About
