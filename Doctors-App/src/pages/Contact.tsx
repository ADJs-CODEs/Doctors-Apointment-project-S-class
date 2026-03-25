import React, { useState } from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { motion } from 'framer-motion'
import {
  RiMapPin2Line,
  RiPhoneLine,
  RiMailSendLine,
  RiStethoscopeLine,
  RiArrowRightUpLine
} from "@remixicon/react"

const Contact: React.FC = () => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  return (
    <div className='max-w-7xl mx-auto px-6 py-20 bg-clinic-bg min-h-screen animate-reveal'>

      {/* --- Header Section --- */}
      <div className='flex flex-col md:flex-row justify-between items-end gap-8 mb-20 border-b border-slate-100 pb-12'>
        <div className='w-full md:w-1/2'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-teal-600 mb-4'>
            <RiMapPin2Line size={14} />
            <span className='text-[10px] font-black uppercase tracking-widest'>Global Network</span>
          </div>
          <h1 className='text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase'>
            Our <span className='text-teal-500 italic font-serif normal-case'>Presence</span>
          </h1>
        </div>
        <p className='text-slate-400 text-sm font-medium max-w-xs text-right hidden md:block'>
          Strategic medical hubs designed for accessible healthcare delivery.
        </p>
      </div>

      <div className='flex flex-col lg:flex-row gap-20 items-center'>

        {/* --- Image Section: Clinical Card Style --- */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className='relative w-full lg:max-w-[500px] group'
        >
          <div className='relative bg-white p-4 rounded-[40px] shadow-clinical border border-slate-100 overflow-hidden'>
            <div className={`aspect-[4/5] rounded-[32px] overflow-hidden bg-slate-100 relative`}>
              {!imageLoaded && (
                <div className='absolute inset-0 bg-slate-200 animate-pulse'></div>
              )}
              <img
                className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                src={assets.contact_image}
                alt="Prescripto HQ"
                onLoad={() => setImageLoaded(true)}
              />
              <div className='absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500'></div>
            </div>
          </div>

          {/* Decorative Badge */}
          <div className='absolute -bottom-6 -right-6 bg-slate-900 text-white p-8 rounded-full shadow-2xl hidden lg:block'>
            <RiPulseFill size={32} className="text-teal-400 animate-pulse" />
          </div>
        </motion.div>

        {/* --- Content Section --- */}
        <div className='flex flex-col gap-16 flex-1'>

          {/* Office Info */}
          <div className='grid md:grid-cols-2 gap-12'>
            <div className='space-y-6'>
              <div>
                <p className='text-teal-600 font-black text-[10px] uppercase tracking-[3px] mb-3'>Headquarters</p>
                <h2 className='text-2xl font-black text-slate-900'>Lagos, Nigeria</h2>
              </div>
              <div className='flex gap-4 items-start'>
                <div className='mt-1 p-2 bg-teal-50 rounded-lg text-teal-600'><RiMapPin2Line size={18} /></div>
                <p className='text-slate-500 text-sm leading-relaxed font-medium'>
                  No 17 Ago Palace Way <br /> Isolo Lagos, Nigeria
                </p>
              </div>
            </div>

            <div className='space-y-6'>
              <p className='text-slate-300 font-black text-[10px] uppercase tracking-[3px] mb-3'>Contact Details</p>
              <div className='space-y-4'>
                <div className='flex items-center gap-4 text-sm font-bold text-slate-700'>
                  <RiPhoneLine size={18} className='text-teal-500' />
                  (+234) 704 203 0981
                </div>
                <div className='flex items-center gap-4 text-sm font-bold text-slate-700'>
                  <RiMailSendLine size={18} className='text-teal-500' />
                  adjscode@gmail.com
                </div>
              </div>
            </div>
          </div>

          {/* Career Section: The "Join Us" Box */}
          <div className='bg-white border border-slate-100 p-10 rounded-[40px] shadow-portal relative overflow-hidden group'>
            <div className='absolute top-0 right-0 p-8 text-teal-500/10 group-hover:text-teal-500/20 transition-colors'>
              <RiStethoscopeLine size={120} />
            </div>

            <div className='relative z-10'>
              <p className='text-teal-600 font-black text-[10px] uppercase tracking-[3px] mb-4'>Careers</p>
              <h2 className='text-2xl font-black text-slate-900 mb-4'>Join Our Medical Team</h2>
              <p className='text-slate-500 text-sm leading-relaxed max-w-md mb-8 font-medium'>
                We are constantly looking for specialized practitioners and medical staff to join our growing network.
              </p>

              <button className='btn-primary flex items-center gap-3 group'>
                Explore Openings
                <RiArrowRightUpLine size={20} className='group-hover:rotate-45 transition-transform' />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// Internal small component for the pulse icon if not imported
const RiPulseFill = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M9 21H5C3.34315 21 2 19.6569 2 18V6C2 4.34315 3.34315 3 5 3H9V5H5C4.44772 5 4 5.44772 4 6V18C4 18.5523 4.44772 19 5 19H9V21ZM15 21H19C20.6569 21 22 19.6569 22 18V6C22 4.34315 20.6569 3 19 3H15V5H19C19.5523 5 20 5.44772 20 6V18C20 18.5523 19.5523 19 19 19H15V21ZM12 6L14 11H10L12 16L10 11H14L12 6Z" />
  </svg>
)

export default Contact