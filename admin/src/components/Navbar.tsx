import React, { useContext } from 'react'
import { assets } from '../assets/assets/assets_admin/assets.js'
import { AdminContext } from '../context/AdminContext.js'
import { useNavigate } from 'react-router-dom'
import { DoctorContext } from '../context/DoctorContext.js'
import { RiLogoutCircleRLine, RiShieldUserLine, RiStethoscopeLine } from '@remixicon/react'
import type { AdminContextType, DoctorContextType } from '../types/index.js'

const Navbar: React.FC = () => {
  const { aToken, setAToken } = useContext(AdminContext) as AdminContextType
  const { dToken, setDToken } = useContext(DoctorContext) as DoctorContextType

  const navigate = useNavigate()

  const logout = (): void => {
    navigate('/')
    if (aToken) {
      setAToken('')
      localStorage.removeItem('aToken')
    }
    if (dToken) {
      setDToken('')
      localStorage.removeItem('dToken')
    }
  }

  return (
    <nav className='sticky top-0 z-50 flex justify-between items-center px-6 md:px-12 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md'>

      {/* --- Logo & Status Badge --- */}
      <div className='flex items-center gap-4'>
        <img
          onClick={() => navigate(aToken ? '/admin-dashboard' : '/doctor-dashboard')}
          className='w-32 md:w-40 cursor-pointer hover:opacity-80 transition-opacity'
          src={assets.admin_logo}
          alt="Serene Medical Logo"
        />

        <div className='flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full text-white'>
          {aToken ? (
            <RiShieldUserLine size={14} className='text-teal-400' />
          ) : (
            <RiStethoscopeLine size={14} className='text-teal-400' />
          )}
          <span className='text-[10px] font-black uppercase tracking-[2px]'>
            {aToken ? 'Admin' : 'Doctor'}
          </span>
        </div>
      </div>

      {/* --- Action Center --- */}
      <div className='flex items-center gap-6'>
        <div className='hidden sm:block text-right'>
          <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Secure Session</p>
          <p className='text-xs font-bold text-slate-900'>Active Now</p>
        </div>

        <button
          onClick={logout}
          className='group flex items-center gap-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-500 px-6 py-2.5 rounded-2xl border border-slate-100 hover:border-red-100 transition-all duration-300 font-black text-[10px] uppercase tracking-widest'
        >
          Logout
          <RiLogoutCircleRLine size={16} className='group-hover:translate-x-1 transition-transform' />
        </button>
      </div>

    </nav>
  )
}

export default Navbar