import React from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { motion } from 'framer-motion'
import {
  RiTimerFlashLine,
  RiGlobalLine,
  RiFingerprintLine,
  RiFocus2Line,
  RiDoubleQuotesL
} from "@remixicon/react"

const About: React.FC = () => {
  return (
    <div className='max-w-7xl mx-auto px-6 py-20 bg-clinic-bg min-h-screen animate-reveal'>

      {/* --- Header Section: Clinical Precision --- */}
      <div className='flex flex-col md:flex-row justify-between items-end gap-8 mb-20 border-b border-slate-100 pb-12'>
        <div className='w-full md:w-1/2'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-teal-600 mb-4'>
            <RiFocus2Line size={14} />
            <span className='text-[10px] font-black uppercase tracking-widest'>Institutional Profile</span>
          </div>
          <h1 className='text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase'>
            About <span className='text-teal-500 italic font-serif normal-case'>Prescripto</span>
          </h1>
        </div>
        <p className='text-slate-400 text-sm font-medium max-w-xs text-right hidden md:block leading-relaxed'>
          Standardizing the future of healthcare through digital excellence and clinical trust.
        </p>
      </div>

      {/* --- Story Section --- */}
      <div className='my-20 flex flex-col lg:flex-row gap-24 items-center'>

        {/* About Image with Shadow-Clinical Frame */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className='relative w-full lg:max-w-[480px] group shrink-0'
        >
          <div className='relative bg-white p-4 rounded-[48px] shadow-clinical border border-slate-100 overflow-hidden'>
            <div className='rounded-[36px] overflow-hidden bg-slate-100'>
              <img
                className='w-full grayscale-[0.2] hover:grayscale-0 transition-all duration-1000 hover:scale-105 object-cover'
                src={assets.about_image}
                alt="About Prescripto"
              />
            </div>
          </div>
        </motion.div>

        {/* Story Content */}
        <div className='flex flex-col gap-10 justify-center flex-1'>
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-[1px] bg-teal-500/30'></div>
              <p className='text-[10px] text-teal-600 font-black uppercase tracking-[3px]'>Our Mission</p>
            </div>
            <p className='text-xl text-slate-700 leading-relaxed font-medium'>
              Welcome to <span className='text-slate-900 font-bold'>Prescripto</span>, your trusted partner in managing healthcare needs with clinical precision. We bridge the gap between world-class practitioners and those seeking elite care.
            </p>
          </div>

          {/* Premium Vision Quote */}
          <div className='bg-white border border-slate-100 p-10 rounded-[40px] shadow-portal relative group hover:border-teal-500/20 transition-all'>
            <RiDoubleQuotesL size={40} className='text-teal-500/10 absolute top-6 right-8 group-hover:text-teal-500/20 transition-colors' />
            <b className='text-slate-400 uppercase tracking-widest text-[9px] font-black block mb-4'>The Strategic Vision</b>
            <p className='text-slate-600 text-lg italic leading-relaxed font-serif'>
              "To create a seamless digital healthcare ecosystem that prioritizes human connection through technological excellence and unwavering data integrity."
            </p>
          </div>
        </div>
      </div>

      {/* --- Why Choose Us Section --- */}
      <div className='mt-40 mb-16 flex items-center gap-6'>
        <h2 className='text-2xl font-black uppercase tracking-[5px] text-slate-900 shrink-0'>
          Why <span className='text-teal-500 font-serif normal-case italic'>Choose Us</span>
        </h2>
        <div className='h-[1px] w-full bg-slate-100'></div>
      </div>

      {/* Features Bento Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-100 rounded-[48px] overflow-hidden bg-white shadow-clinical'>

        {/* Feature 1: Efficiency */}
        <div className='group p-12 lg:p-16 flex flex-col gap-8 hover:bg-slate-50 transition-all duration-500 border-b md:border-b-0 md:border-r border-slate-100'>
          <div className='w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-sm'>
            <RiTimerFlashLine size={28} />
          </div>
          <div className='space-y-4'>
            <p className='text-teal-600 font-black text-[9px] uppercase tracking-[3px]'>01. Efficiency</p>
            <b className='text-slate-900 text-xl block font-black'>Precision Booking</b>
            <p className='text-slate-500 text-sm leading-relaxed font-medium'>Advanced scheduling protocols designed to respect your professional time and health priorities.</p>
          </div>
        </div>

        {/* Feature 2: Convenience */}
        <div className='group p-12 lg:p-16 flex flex-col gap-8 hover:bg-slate-50 transition-all duration-500 border-b md:border-b-0 md:border-r border-slate-100'>
          <div className='w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-sm'>
            <RiGlobalLine size={28} />
          </div>
          <div className='space-y-4'>
            <p className='text-teal-600 font-black text-[9px] uppercase tracking-[3px]'>02. Convenience</p>
            <b className='text-slate-900 text-xl block font-black'>Global Network</b>
            <p className='text-slate-500 text-sm leading-relaxed font-medium'>Instant access to a verified network of leading medical consultants from across the region.</p>
          </div>
        </div>

        {/* Feature 3: Security */}
        <div className='group p-12 lg:p-16 flex flex-col gap-8 hover:bg-slate-50 transition-all duration-500'>
          <div className='w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-sm'>
            <RiFingerprintLine size={28} />
          </div>
          <div className='space-y-4'>
            <p className='text-teal-600 font-black text-[9px] uppercase tracking-[3px]'>03. Security</p>
            <b className='text-slate-900 text-xl block font-black'>Data Integrity</b>
            <p className='text-slate-500 text-sm leading-relaxed font-medium'>Biometric-standard data security ensuring your medical records remain strictly confidential.</p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default About