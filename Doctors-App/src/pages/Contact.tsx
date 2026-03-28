import React, { useState } from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { motion } from 'framer-motion'
import {
  RiMapPin2Line,
  RiPhoneLine,
  RiMailSendLine,
  RiStethoscopeLine,
  RiArrowRightUpLine,
  RiPulseLine
} from "@remixicon/react"

const Contact: React.FC = () => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 bg-white min-h-screen'>

      {/* --- Header Section --- */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8 mb-12 md:mb-20 border-b border-slate-100 pb-10 md:pb-12'>
        <div className='w-full md:w-1/2'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-teal-600 mb-4'>
            <RiMapPin2Line size={14} />
            <span className='text-[9px] md:text-[10px] font-black uppercase tracking-widest'>Global Network</span>
          </div>
          <h1 className='text-3xl md:text-5xl font-black tracking-tight text-slate-900 uppercase'>
            Our <span className='text-teal-500 italic font-serif normal-case'>Presence</span>
          </h1>
        </div>
        <p className='text-slate-400 text-xs md:text-sm font-medium max-w-xs md:text-right leading-relaxed'>
          Strategic medical hubs designed for accessible healthcare delivery across the region.
        </p>
      </div>

      <div className='flex flex-col lg:flex-row gap-12 lg:gap-20 items-center'>

        {/* --- Image Section --- */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className='relative w-full lg:max-w-[500px] group'
        >
          <div className='relative bg-white p-3 md:p-4 rounded-[32px] md:rounded-[40px] shadow-xl border border-slate-100 overflow-hidden'>
            <div className='aspect-[4/5] rounded-[24px] md:rounded-[32px] overflow-hidden bg-slate-100 relative'>
              {!imageLoaded && (
                <div className='absolute inset-0 bg-slate-200 animate-pulse'></div>
              )}
              <img
                className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                src={assets.contact_image}
                alt="ADJ's CODEs HQ"
                onLoad={() => setImageLoaded(true)}
              />
              <div className='absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500'></div>
            </div>
          </div>

          {/* Decorative Pulse Badge */}
          <div className='absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-slate-900 text-white p-6 md:p-8 rounded-full shadow-2xl hidden sm:block'>
            <RiPulseLine size={32} className="text-teal-400 animate-pulse" />
          </div>
        </motion.div>

        {/* --- Content Section --- */}
        <div className='flex flex-col gap-12 md:gap-16 flex-1 w-full'>

          {/* Office Info */}
          <div className='grid sm:grid-cols-2 gap-10 md:gap-12'>
            <div className='space-y-4 md:space-y-6'>
              <div>
                <p className='text-teal-600 font-black text-[9px] md:text-[10px] uppercase tracking-[3px] mb-2 md:mb-3'>Headquarters</p>
                <h2 className='text-xl md:text-2xl font-black text-slate-900'>Lagos, Nigeria</h2>
              </div>
              <div className='flex gap-4 items-start'>
                <div className='mt-1 p-2 bg-teal-50 rounded-lg text-teal-600 shrink-0'><RiMapPin2Line size={18} /></div>
                <p className='text-slate-500 text-sm leading-relaxed font-medium'>
                  No 17 Ago Palace Way <br /> Isolo Lagos, Nigeria
                </p>
              </div>
            </div>

            <div className='space-y-4 md:space-y-6'>
              <p className='text-slate-400 font-black text-[9px] md:text-[10px] uppercase tracking-[3px] mb-2 md:mb-3'>Contact Details</p>
              <div className='space-y-4'>
                <div className='flex items-center gap-4 text-sm font-bold text-slate-700 hover:text-teal-600 transition-colors'>
                  <RiPhoneLine size={18} className='text-teal-500' />
                  (+234) 704 203 0981
                </div>
                <div className='flex items-center gap-4 text-sm font-bold text-slate-700 hover:text-teal-600 transition-colors'>
                  <RiMailSendLine size={18} className='text-teal-500' />
                  adjscode@gmail.com
                </div>
              </div>
            </div>
          </div>

          {/* Career Section */}
          <motion.div
            whileHover={{ y: -5 }}
            className='bg-slate-900 rounded-[32px] md:rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20'
          >
            {/* Background Icon Decoration */}
            <div className='absolute -top-4 -right-4 p-8 text-white/5 group-hover:text-teal-500/10 transition-colors pointer-events-none'>
              <RiStethoscopeLine size={160} />
            </div>

            <div className='relative z-10'>
              <p className='text-teal-400 font-black text-[9px] md:text-[10px] uppercase tracking-[3px] mb-4'>Careers</p>
              <h2 className='text-2xl md:text-3xl font-black text-white mb-4 uppercase tracking-tight'>Join Our <br className='sm:hidden' /> <span className='text-teal-400 font-serif normal-case italic'>Medical Team</span></h2>
              <p className='text-slate-400 text-xs md:text-sm leading-relaxed max-w-md mb-8 font-medium'>
                We are constantly looking for specialized practitioners and clinical staff to join our growing network of digital healthcare providers.
              </p>

              <button className='w-full sm:w-auto bg-teal-500 text-slate-950 px-8 py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 group transition-all hover:bg-white'>
                Explore Openings
                <RiArrowRightUpLine size={20} className='group-hover:rotate-45 transition-transform' />
              </button>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}

export default Contact