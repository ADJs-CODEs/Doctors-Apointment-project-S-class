import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext.js'
import { useNavigate } from 'react-router-dom'
import { DoctorContext } from '../context/DoctorContext.js'
import { AppContext } from '../context/AppContext.js'
import { RiLogoutCircleRLine, RiShieldUserLine, RiStethoscopeLine } from '@remixicon/react'
import type { AdminContextType, DoctorContextType, AppContextType } from '../types/index.js'
import { motion } from 'framer-motion'

const Navbar: React.FC = () => {
  const { aToken, setAToken } = useContext(AdminContext) as AdminContextType
  const { dToken, setDToken } = useContext(DoctorContext) as DoctorContextType
  const { setProgress } = useContext(AppContext) as AppContextType

  const navigate = useNavigate()

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

  const handleLogoClick = () => {
    setProgress(40)
    navigate(aToken ? '/admin-dashboard' : '/doctor-dashboard')
    setTimeout(() => setProgress(100), 500)
  }

  return (
    <nav className='sticky top-0 z-50 flex justify-between items-center px-4 sm:px-6 md:px-12 py-4 md:py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md'>

      {/* --- LOGO & STATUS --- */}
      <div className='flex items-center gap-3 sm:gap-6'>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogoClick}
          className='flex items-center gap-2 sm:gap-4 cursor-pointer'
        >
          {/* Responsive Cross Token: Smaller on mobile, original on md+ */}
          <div className='w-10 h-10 sm:w-14 sm:h-14 bg-teal-50 rounded-full border-2 border-dotted border-teal-300 flex items-center justify-center shadow-sm shrink-0'>
            <div className='text-teal-600 font-black text-2xl sm:text-4xl leading-none'>+</div>
          </div>

          {/* Branding Text: Font sizes adjust based on screen width */}
          <div className='flex flex-col leading-tight'>
            <span className='text-lg sm:text-2xl font-black text-slate-900 tracking-tighter uppercase'>
              ADJ's <span className='text-teal-600'>CODEs</span>
            </span>
            <span className='text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[2px] sm:tracking-[3px] -mt-1'>
              Pharmaceutical
            </span>
          </div>
        </motion.div>

        {/* Status Badge: Hidden on mobile, visible from sm (tablet) upwards */}
        <div className='hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-slate-900 rounded-full text-white shadow-lg shadow-slate-200'>
          {aToken ? (
            <RiShieldUserLine size={12} className='text-teal-400' />
          ) : (
            <RiStethoscopeLine size={12} className='text-teal-400' />
          )}
          <span className='text-[8px] sm:text-[10px] font-black uppercase tracking-[1px] sm:tracking-[2px]'>
            {aToken ? 'Admin' : 'Doctor'}
          </span>
        </div>
      </div>

      {/* --- Action Center --- */}
      <div className='flex items-center gap-3 sm:gap-6'>
        {/* Hidden on mobile, visible on tablet (sm) and up */}
        <div className='hidden md:block text-right'>
          <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Secure Session</p>
          <p className='text-xs font-bold text-slate-900'>Active Now</p>
        </div>

        <button
          onClick={logout}
          className='group flex items-center gap-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-500 px-4 sm:px-7 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-rose-100 transition-all duration-300 font-black text-[9px] sm:text-[10px] uppercase tracking-widest active:scale-95'
        >
          {/* Text hidden on very small phones to save space, icon remains */}
          <span className='hidden xs:block'>Logout</span>
          <RiLogoutCircleRLine size={16} className='group-hover:translate-x-1 transition-transform' />
        </button>
      </div>

    </nav>
  )
}

export default Navbar