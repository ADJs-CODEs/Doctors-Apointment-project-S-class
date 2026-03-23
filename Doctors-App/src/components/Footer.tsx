import React from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'

const Footer: React.FC = () => {
  return (
    <div className='md:mx-10'>
      <div className='flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm'>

        {/* -----------Left Section ---------- */}
        <div>
          <img className='mb-5 w-40' src={assets.logo} alt="Prescripto Logo" />
          <p className='w-full md:w-2/3 text-gray-600 leading-6'>
            ADJ,s CODEs Pharmaceutical is dedicated to bridging the gap between patients and healthcare providers.
            We provide a seamless platform for scheduling appointments and managing your health records with
            the latest technology.
          </p>
        </div>

        {/* ------------Center Section ---------- */}
        <div>
          <p className='text-xl font-medium mb-5'>COMPANY</p>
          <ul className='flex flex-col gap-2 text-gray-600'>
            <li className='cursor-pointer hover:text-primary transition-all'>Home</li>
            <li className='cursor-pointer hover:text-primary transition-all'>About Us</li>
            <li className='cursor-pointer hover:text-primary transition-all'>Contact Us</li>
            <li className='cursor-pointer hover:text-primary transition-all'>Privacy Policy</li>
          </ul>
        </div>

        {/* ------------Right Section ------------- */}
        <div>
          <p className='text-xl font-medium mb-5'>GET IN TOUCH</p>
          <ul className='flex flex-col gap-2 text-gray-600'>
            <li>(+234) 704 203 0981</li>
            <li>adjscode@gmail.com</li>
          </ul>
        </div>
      </div>

      {/* ---------Copyright Text---------- */}
      <div>
        <hr className='border-gray-400' />
        <p className='py-5 text-sm text-center'>
          Copyright 2026 @ ADJ,s CODEs Pharmaceutical - All Rights Reserved.
        </p>
      </div>
    </div>
  )
}

export default Footer