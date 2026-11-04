"use client";

import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext'
import { useNavigate } from "@/lib/navigation"
import { DoctorContext } from '../context/DoctorContext'
import { RiShieldUserLine, RiStethoscopeLine, RiStore2Line } from '@remixicon/react'
import type { AdminContextType, DoctorContextType } from '../types/index'
import { motion } from 'framer-motion'
import DoctorBell from './DoctorBell'
import { usePharmacy } from '../context/PharmacyContext'

const Navbar: React.FC = () => {
  const { aToken } = useContext(AdminContext) as AdminContextType
  const { dToken } = useContext(DoctorContext) as DoctorContextType
  const { pToken } = usePharmacy()
  const role = aToken ? 'Admin' : dToken ? 'Doctor' : pToken ? 'Pharmacy' : ''

  const navigate = useNavigate()

  const handleLogoClick = () => {
    navigate(aToken ? '/admin-dashboard' : dToken ? '/doctor-dashboard' : '/pharmacy')
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
          {role === 'Admin' ? (
            <RiShieldUserLine size={12} className='text-teal-400' />
          ) : role === 'Doctor' ? (
            <RiStethoscopeLine size={12} className='text-teal-400' />
          ) : (
            <RiStore2Line size={12} className='text-teal-400' />
          )}
          <span className='text-[8px] sm:text-[10px] font-black uppercase tracking-[1px] sm:tracking-[2px]'>
            {role}
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

        {dToken && <DoctorBell />}
        {/* logging out lives at the bottom of the sidebar */}
      </div>

    </nav>
  )
}

export default Navbar