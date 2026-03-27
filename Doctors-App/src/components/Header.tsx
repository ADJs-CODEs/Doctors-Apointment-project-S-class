import React from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { motion } from 'framer-motion'
import { RiArrowRightUpLine, RiTeamFill, RiShieldCheckFill } from '@remixicon/react'

const Header: React.FC = () => {
  return (
    <div className='max-w-7xl mx-auto px-6 pt-10 pb-20'>
      <div className='relative bg-slate-900 rounded-[48px] overflow-hidden flex flex-col lg:flex-row items-center min-h-[600px] border border-white/5'>

        {/* Abstract Background Elements */}
        <div className='absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none'>
          <div className='absolute -top-24 -left-24 w-96 h-96 bg-teal-500/10 blur-[100px] rounded-full' />
          <div className='absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full' />
        </div>

        {/* --- Left Side: Content --- */}
        <div className='flex-1 z-10 py-16 px-10 lg:px-20 text-center lg:text-left'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className='inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-teal-400 mb-8'
          >
            <RiShieldCheckFill size={16} />
            <span className='text-[10px] font-black uppercase tracking-[3px]'>Lagos Trusted Network</span>
          </motion.div>

          <h1 className='text-4xl md:text-6xl font-black text-white leading-[1.1] mb-8 uppercase tracking-tight'>
            Precision Care <br />
            <span className='text-teal-400 font-serif normal-case italic'>By Elite Doctors</span>
          </h1>

          <div className='flex flex-col md:flex-row items-center gap-6 mb-12 text-slate-400 text-sm font-medium'>
            <div className='flex -space-x-3'>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className='w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden'>
                  <RiTeamFill size={18} className='text-slate-500' />
                </div>
              ))}
            </div>
            <p className='max-w-xs'>
              Join <span className='text-white font-bold'>2,400+</span> patients who trust our clinical specialists daily.
            </p>
          </div>

          <motion.a
            href='#speciality'
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='inline-flex items-center gap-4 bg-teal-400 text-slate-950 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-teal-500/20 hover:bg-white transition-all'
          >
            Start Consultation
            <RiArrowRightUpLine size={20} />
          </motion.a>
        </div>

        {/* --- Right Side: Image --- */}
        <div className='lg:w-1/2 relative flex justify-end items-end h-full px-10 lg:px-0'>
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className='w-full max-w-[550px] object-contain drop-shadow-[-30px_0_60px_rgba(0,0,0,0.8)]'
            src={assets.header_img}
            alt="Lead Surgeon"
          />
        </div>
      </div>
    </div>
  )
}

export default Header