import React, { useContext, useState } from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppContext } from '../Context/AppContext.js';
import type { AppContextType } from '../types/index.js';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircle, List, X, SignOut, CalendarCheck, UserGear, CaretDown } from "@phosphor-icons/react";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { token, setToken, userData } = useContext(AppContext) as AppContextType;
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
    navigate('/login');
  }

  // REBRANDED STYLES: Airy Clinical
  const activeClass = "relative py-1 text-teal-600 font-bold after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-0.5 after:bg-teal-500 after:rounded-full transition-all duration-500";
  const normalClass = "py-1 text-slate-500 font-bold hover:text-teal-600 transition-all duration-300";

  return (
    <nav className='sticky top-0 z-50 py-4 px-6 md:px-10 bg-white/70 backdrop-blur-xl border-b border-slate-100 md:mt-4 md:mx-4 md:rounded-[28px] shadow-sm'>
      <div className='max-w-7xl mx-auto flex items-center justify-between'>

        {/* Logo - Removed brightness filter for clean brand look */}
        <motion.img
          whileHover={{ scale: 1.02 }}
          onClick={() => { navigate('/'); window.scrollTo(0, 0) }}
          className='w-36 cursor-pointer transition-all'
          src={assets.logo}
          alt="Clinic Logo"
        />

        {/* Desktop Menu - Rebranded Typography */}
        <ul className='hidden md:flex items-center gap-10 text-[11px] tracking-[2px] font-bold'>
          {['HOME', 'DOCTORS', 'ABOUT', 'CONTACT'].map((item) => (
            <NavLink key={item} to={item === 'HOME' ? '/' : `/${item.toLowerCase()}`}>
              {({ isActive }) => (
                <li className={isActive ? activeClass : normalClass}>{item}</li>
              )}
            </NavLink>
          ))}
        </ul>

        {/* Right Section */}
        <div className='flex items-center gap-6'>
          {token && userData ? (
            <div className='flex items-center gap-3 cursor-pointer group relative'>
              <div className='relative'>
                {/* Soft Blue Ring instead of Neon Emerald */}
                <div className='absolute -inset-1 bg-teal-500/10 rounded-full blur-sm group-hover:bg-teal-500/20 transition duration-500'></div>
                <img className='w-9 h-9 rounded-xl border border-slate-100 relative z-10 object-cover shadow-sm' src={userData.image} alt="Profile" />
              </div>

              <div className='hidden lg:flex items-center gap-1'>
                <p className='text-[11px] font-bold text-slate-700 uppercase tracking-wider'>{userData.name.split(' ')[0]}</p>
                <CaretDown size={12} weight="bold" className='text-slate-400 group-hover:rotate-180 transition-transform' />
              </div>

              {/* REBRANDED Dropdown: Clinical White */}
              <div className='absolute top-full right-0 pt-4 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-50'>
                <div className='min-w-56 bg-white border border-slate-100 rounded-[24px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.08)]'>
                  <div onClick={() => navigate('/my-profile')} className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group/item'>
                    <UserGear size={20} weight="duotone" className="text-slate-400 group-hover/item:text-teal-600" />
                    <span className='text-xs font-bold text-slate-600'>Profile Settings</span>
                  </div>
                  <div onClick={() => navigate('/my-appointments')} className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group/item'>
                    <CalendarCheck size={20} weight="duotone" className="text-slate-400 group-hover/item:text-teal-600" />
                    <span className='text-xs font-bold text-slate-600'>My Appointments</span>
                  </div>
                  <div className='h-[1px] bg-slate-50 my-1 mx-2' />
                  <div onClick={logout} className='flex items-center gap-3 px-4 py-3 hover:bg-rose-50 rounded-xl transition-all group/item'>
                    <SignOut size={20} weight="duotone" className="text-rose-500" />
                    <span className='text-xs font-bold text-rose-500'>Sign Out</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className='hidden md:flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[2px] hover:bg-teal-600 transition-all shadow-lg shadow-slate-100'
            >
              Patient Portal
            </button>
          )}

          {/* Mobile Toggle */}
          <div onClick={() => setShowMenu(true)} className='md:hidden p-2.5 bg-slate-50 rounded-xl border border-slate-100'>
            <List size={24} weight="bold" className="text-slate-900" />
          </div>
        </div>

        {/* ---------- Rebranded Mobile Menu ------------- */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='fixed inset-0 z-[60] bg-white md:hidden flex flex-col'
            >
              <div className='flex items-center justify-between px-8 py-8 border-b border-slate-50'>
                <img className='w-32' src={assets.logo} alt="Logo" />
                <div onClick={() => setShowMenu(false)} className='p-2.5 bg-slate-50 rounded-xl'>
                  <X size={24} weight="bold" className="text-slate-900" />
                </div>
              </div>

              <ul className='flex flex-col gap-6 mt-12 px-10'>
                {['HOME', 'DOCTORS', 'ABOUT', 'CONTACT'].map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <NavLink
                      onClick={() => setShowMenu(false)}
                      to={item === 'HOME' ? '/' : `/${item.toLowerCase()}`}
                    >
                      <li className='text-4xl font-black tracking-tighter text-slate-300 hover:text-teal-500 transition-all uppercase'>
                        {item}
                      </li>
                    </NavLink>
                  </motion.div>
                ))}
              </ul>

              <div className='mt-auto p-10 border-t border-slate-50'>
                <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2'>Health Hotline</p>
                <p className='text-xl font-bold text-slate-900'>(+234) 704 203 0981</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navbar