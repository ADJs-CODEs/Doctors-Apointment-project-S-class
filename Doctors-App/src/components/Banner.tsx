import React from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RiCalendarCheckFill, RiArrowRightLine } from '@remixicon/react'

const Banner: React.FC = () => {
  const navigate = useNavigate()

  const handleAction = () => {
    navigate('/login')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className='max-w-7xl mx-auto px-6 mb-24 md:px-10'>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className='relative bg-slate-900 rounded-[48px] overflow-hidden shadow-2xl flex flex-col md:flex-row items-center min-h-[400px]'
      >
        {/* --- Background Ambient Glow --- */}
        <div className='absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/10 blur-[120px] rounded-full -mr-40 -mt-40' />

        {/* --- Left Side: Content --- */}
        <div className='flex-1 py-12 md:py-20 px-10 md:px-16 z-10 text-center md:text-left'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-teal-400 mb-6'>
            <RiCalendarCheckFill size={14} />
            <span className='text-[10px] font-black uppercase tracking-widest'>Secure Booking</span>
          </div>

          <h2 className='text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-6 uppercase tracking-tight'>
            Book Appointment <br />
            <span className='text-teal-400 font-serif normal-case italic'>With 100+ Trusted Doctors</span>
          </h2>

          <p className='text-slate-400 text-sm md:text-base font-medium mb-10 max-w-md mx-auto md:mx-0'>
            Experience clinical excellence with our verified network of medical professionals in Lagos.
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAction}
            className='bg-white text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 mx-auto md:mx-0 shadow-lg hover:bg-teal-400 transition-colors group'
          >
            Create Your Account
            <RiArrowRightLine size={18} className='text-teal-600 group-hover:text-slate-900 transition-colors' />
          </motion.button>
        </div>

        {/* --- Right Side: Image --- */}
        <div className='hidden md:block md:w-1/2 lg:w-[450px] relative self-end'>
          <motion.img
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className='w-full object-contain drop-shadow-[-20px_0_50px_rgba(0,0,0,0.5)]'
            src={assets.appointment_img}
            alt="Doctor Banner"
          />
        </div>
      </motion.div>
    </div>
  )
}

export default Banner