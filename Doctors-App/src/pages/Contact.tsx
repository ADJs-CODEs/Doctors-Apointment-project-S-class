import React, { useState } from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'

const Contact: React.FC = () => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  return (
    <div className='animate-reveal'>
      <div className='text-center text-2xl pt-10 text-gray-500'>
        <p>CONTACT <span className='text-gray-700 font-semibold'>US</span></p>
      </div>

      <div className='my-10 flex flex-col justify-center md:flex-row gap-10 text-sm'>
        <div className='relative w-full md:max-w-[360px]'>
          {!imageLoaded && (
            <div className='absolute inset-0 bg-slate-200 animate-pulse rounded-lg'></div>
          )}
          <img
            className={`w-full md:max-w-[360px] transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            src={assets.contact_image}
            alt="Contact Office"
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        <div className='flex flex-col justify-center items-start gap-6'>
          <p className='font-semibold text-lg text-gray-600'>OUR OFFICE</p>
          <p className='text-gray-500'>No 17 Ago Palace Way <br /> Isolo Lagos, Nigeria</p>
          <p className='text-gray-500'>Tel: (+234) 704 203 0981 <br /> Email: adjscode@gmail.com</p>

          <p className='font-semibold text-lg text-gray-600'>CAREERS AT PRESCRIPTO</p>
          <p className='text-gray-500'>Learn more about our teams and job openings.</p>

          <button className='border border-black px-8 py-4 text-sm hover:bg-black hover:text-white transition-all duration-500'>
            Explore Jobs
          </button>
        </div>
      </div>
    </div>
  )
}

export default Contact
