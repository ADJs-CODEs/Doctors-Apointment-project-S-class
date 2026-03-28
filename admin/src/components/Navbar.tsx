import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext.js'
import { useNavigate } from 'react-router-dom'
import { DoctorContext } from '../context/DoctorContext.js'
import { AppContext } from '../context/AppContext.js' // Added to access progress
import { RiLogoutCircleRLine, RiShieldUserLine, RiStethoscopeLine } from '@remixicon/react'
import type { AdminContextType, DoctorContextType, AppContextType } from '../types/index.js'
import { motion } from 'framer-motion'

const Navbar: React.FC = () => {
  const { aToken, setAToken } = useContext(AdminContext) as AdminContextType
  const { dToken, setDToken } = useContext(DoctorContext) as DoctorContextType
  // 1. Accessing setProgress from AppContext
  const { setProgress } = useContext(AppContext) as AppContextType

  const navigate = useNavigate()

  // 2. Logic remains identical, just added progress bar triggers
  const logout = (): void => {
    setProgress(40)
    navigate('/')
    if (aToken) {
      setAToken('')
      localStorage.removeItem('aToken')
    }
    if (dToken) {
      setDToken('')
      localStorage.removeItem('dToken')
    }
    setTimeout(() => setProgress(100), 500)
  }

  // 3. Helper for navigation clicks
  const handleLogoClick = () => {
    setProgress(40)
    navigate(aToken ? '/admin-dashboard' : '/doctor-dashboard')
    setTimeout(() => setProgress(100), 500)
  }

  return (
    <nav className='sticky top-0 z-50 flex justify-between items-center px-6 md:px-12 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md'>

      {/* --- REBRANDED LOGO & STATUS --- */}
      <div className='flex items-center gap-6'>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }} // Added for mobile responsiveness
          onClick={handleLogoClick}
          className='flex items-center gap-4 cursor-pointer'
        >
          {/* Scaled Up Cross Token */}
          <div className='w-14 h-14 bg-teal-50 rounded-full border-2 border-dotted border-teal-300 flex items-center justify-center shadow-sm shrink-0'>
            <div className='text-teal-600 font-black text-4xl leading-none'>+</div>
          </div>

          {/* Bold Branding Text */}
          <div className='flex flex-col leading-tight'>
            <span className='text-2xl font-black text-slate-900 tracking-tighter uppercase'>
              ADJ's <span className='text-teal-600'>CODEs</span>
            </span>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-[3px] -mt-1'>
              Pharmaceutical
            </span>
          </div>
        </motion.div>

        {/* Status Badge */}
        <div className='hidden lg:flex items-center gap-2 px-4 py-1.5 bg-slate-900 rounded-full text-white shadow-lg shadow-slate-200'>
          {aToken ? (
            <RiShieldUserLine size={14} className='text-teal-400' />
          ) : (
            <RiStethoscopeLine size={14} className='text-teal-400' />
          )}
          <span className='text-[10px] font-black uppercase tracking-[2px]'>
            {aToken ? 'Admin Access' : 'Doctor Access'}
          </span>
        </div>
      </div>

      {/* --- Action Center --- */}
      <div className='flex items-center gap-6'>
        <div className='hidden sm:block text-right'>
          <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Secure Session</p>
          <p className='text-xs font-bold text-slate-900'>Active Now</p>
        </div>

        {/* Added active:scale-95 for better mobile "click" feedback */}
        <button
          onClick={logout}
          className='group flex items-center gap-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-500 px-7 py-3 rounded-2xl border border-slate-100 hover:border-rose-100 transition-all duration-300 font-black text-[10px] uppercase tracking-widest active:scale-95'
        >
          Logout
          <RiLogoutCircleRLine size={16} className='group-hover:translate-x-1 transition-transform' />
        </button>
      </div>

    </nav>
  )
}

export default Navbar