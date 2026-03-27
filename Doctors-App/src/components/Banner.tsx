import React from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RiCalendarCheckFill, RiArrowRightLine, RiUserFollowFill } from '@remixicon/react'

const Banner: React.FC = () => {
  const navigate = useNavigate()

  const handleAction = () => {
    navigate('/login')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className='max-w-7xl mx-auto px-6 mb-32 md:px-10'>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className='relative bg-slate-900 rounded-[56px] overflow-hidden shadow-2xl flex flex-col md:flex-row items-center min-h-[450px] border border-white/5'
      >
        {/* --- Background Decorative Elements --- */}
        <div className='absolute top-0 right-0 w-[400px] h-[400px] bg-teal-500/10 blur-[120px] rounded-full -mr-20 -mt-20' />
        <div className='absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full -ml-20 -mb-20' />

        {/* --- Left Side: Content --- */}
        <div className='flex-1 py-16 md:py-24 px-10 md:px-20 z-10 text-center md:text-left'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-teal-400 mb-8'>
            <RiUserFollowFill size={14} />
            <span className='text-[10px] font-black uppercase tracking-[3px]'>Patient Registration Open</span>
          </div>

          <h2 className='text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] mb-8 uppercase tracking-tighter'>
            Schedule Your <br />
            <span className='text-teal-400 font-serif normal-case italic text-4xl lg:text-6xl'>Clinical Consultation</span>
          </h2>

          <p className='text-slate-400 text-sm md:text-base font-medium mb-10 max-w-md mx-auto md:mx-0 leading-relaxed'>
            Join our secure medical network today. Experience the future of healthcare management with our verified specialists.
          </p>

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#2dd4bf' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAction}
            className='bg-white text-slate-950 px-12 py-5 rounded-2xl font-black uppercase tracking-[2px] text-[11px] flex items-center justify-center gap-3 mx-auto md:mx-0 shadow-xl transition-all group'
          >
            Create Your Account
            <RiArrowRightLine size={18} className='text-teal-600 group-hover:text-slate-950 transition-colors' />
          </motion.button>
        </div>

        {/* --- Right Side: Image --- */}
        <div className='hidden md:block md:w-1/2 lg:w-[480px] relative self-end pr-10 lg:pr-20'>
          <motion.img
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className='w-full object-contain drop-shadow-[-20px_0_80px_rgba(0,0,0,0.6)]'
            src={assets.appointment_img}
            alt="Doctor Banner"
          />
        </div>
      </motion.div>
    </div>
  )
}

export default Banner