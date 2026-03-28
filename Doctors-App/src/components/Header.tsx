import React from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { motion } from 'framer-motion'
import { RiArrowRightUpLine, RiTeamFill, RiShieldCheckFill } from '@remixicon/react'

const Header: React.FC = () => {
  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-12 md:pb-20'>
      <div className='relative bg-slate-900 rounded-[32px] md:rounded-[48px] overflow-hidden flex flex-col lg:flex-row items-center min-h-[500px] md:min-h-[600px] border border-white/5'>

        {/* Abstract Background Elements */}
        <div className='absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none'>
          <div className='absolute -top-12 md:-top-24 -left-12 md:-left-24 w-64 h-64 md:w-96 md:h-96 bg-teal-500/10 blur-[60px] md:blur-[100px] rounded-full' />
          <div className='absolute bottom-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-500/5 blur-[80px] md:blur-[120px] rounded-full' />
        </div>

        {/* --- Left Side: Content --- */}
        <div className='flex-1 z-10 py-12 md:py-16 px-6 sm:px-10 lg:px-20 text-center lg:text-left'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className='inline-flex items-center gap-2 px-3 md:px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-teal-400 mb-6 md:mb-8'
          >
            <RiShieldCheckFill size={14} className="md:size-[16px]" />
            <span className='text-[8px] md:text-[10px] font-black uppercase tracking-[2px] md:tracking-[3px]'>Lagos Trusted Network</span>
          </motion.div>

          <h1 className='text-3xl sm:text-4xl md:text-6xl font-black text-white leading-[1.1] mb-6 md:mb-8 uppercase tracking-tight'>
            Precision Care <br />
            <span className='text-teal-400 font-serif normal-case italic text-4xl md:text-7xl'>By Elite Doctors</span>
          </h1>

          <div className='flex flex-col md:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6 mb-10 md:mb-12 text-slate-400 text-xs md:text-sm font-medium'>
            <div className='flex -space-x-3'>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className='w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0'>
                  <RiTeamFill size={16} className='text-slate-500' />
                </div>
              ))}
            </div>
            <p className='max-w-[250px] md:max-w-xs leading-relaxed'>
              Join <span className='text-white font-bold'>2,400+</span> patients who trust our clinical specialists daily.
            </p>
          </div>

          <motion.a
            href='#speciality'
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='inline-flex items-center justify-center gap-3 md:gap-4 bg-teal-400 text-slate-950 px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-xl shadow-teal-500/20 hover:bg-white transition-all w-full sm:w-auto'
          >
            Start Consultation
            <RiArrowRightUpLine size={18} className="md:size-[20px]" />
          </motion.a>
        </div>

        {/* --- Right Side: Image --- */}
        {/* Adjusted padding and positioning for better mobile stacking */}
        <div className='lg:w-1/2 relative flex justify-center lg:justify-end items-end w-full mt-8 lg:mt-0 px-6 sm:px-10 lg:px-0'>
          <motion.img
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className='w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[550px] object-contain drop-shadow-[-20px_0_40px_rgba(0,0,0,0.6)] lg:drop-shadow-[-30px_0_60px_rgba(0,0,0,0.8)]'
            src={assets.header_img}
            alt="Lead Surgeon"
          />
        </div>
      </div>
    </div>
  )
}

export default Header