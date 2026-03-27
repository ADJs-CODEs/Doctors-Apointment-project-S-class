import React, { useContext, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppContext } from '../Context/AppContext.js';
import type { AppContextType } from '../types/index.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  X,
  SignOut,
  CalendarCheck,
  UserGear,
  CaretDown,
  Fingerprint
} from "@phosphor-icons/react";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { token, setToken, userData, loading } = useContext(AppContext) as AppContextType;
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
    navigate('/login');
    setShowMenu(false);
  }

  const activeClass = "relative py-1 text-teal-600 font-bold after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-0.5 after:bg-teal-500 after:rounded-full transition-all duration-500";
  const normalClass = "py-1 text-slate-500 font-bold hover:text-teal-600 transition-all duration-300";

  return (
    <nav className='sticky top-0 z-50 py-4 px-6 md:px-10 bg-white/70 backdrop-blur-xl border-b border-slate-100 md:mt-4 md:mx-4 md:rounded-[28px] shadow-sm'>
      
      {/* --- GLOBAL PROGRESS BAR --- */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden md:rounded-t-[28px]">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-1/3 h-full bg-teal-500 shadow-[0_0_10px_#14b8a6]"
          />
        </div>
      )}

      <div className='max-w-7xl mx-auto flex items-center justify-between'>
        {/* LOGO SECTION */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => { navigate('/'); window.scrollTo(0, 0) }}
          className='flex items-center gap-3 cursor-pointer'
        >
          <div className='w-11 h-11 bg-teal-50 rounded-full border-2 border-dotted border-teal-200 flex items-center justify-center shadow-sm shrink-0'>
            <div className='text-teal-600 font-black text-2xl leading-none'>+</div>
          </div>
          <div className='flex flex-col leading-tight'>
            <span className='text-[16px] md:text-[19px] font-black text-slate-800 tracking-tighter uppercase'>
              ADJ's <span className='text-teal-600'>CODEs</span>
            </span>
            <span className='text-[8px] md:text-[9.5px] font-bold text-slate-400 uppercase tracking-[2.5px] -mt-1'>
              Pharmaceutical
            </span>
          </div>
        </motion.div>

        {/* DESKTOP MENU */}
        <ul className='hidden md:flex items-center gap-10 text-[11px] tracking-[2px] font-bold'>
          {['HOME', 'DOCTORS', 'ABOUT', 'CONTACT'].map((item) => (
            <NavLink key={item} to={item === 'HOME' ? '/' : `/${item.toLowerCase()}`}>
              {({ isActive }) => (
                <li className={isActive ? activeClass : normalClass}>{item}</li>
              )}
            </NavLink>
          ))}
        </ul>

        {/* RIGHT SECTION */}
        <div className='flex items-center gap-6'>
          {token && userData ? (
            <div className='flex items-center gap-3 cursor-pointer group relative'>
              <div className='relative isolate'>
                <div className='absolute -inset-1 bg-teal-500/10 rounded-full blur-sm group-hover:bg-teal-500/20 transition duration-500'></div>
                <img className='w-9 h-9 rounded-xl border border-slate-100 relative z-10 object-cover bg-white shadow-sm' src={userData.image.replace('/upload/', '/upload/f_jpg,q_auto:best/')} alt="Profile" />
              </div>
              <div className='hidden lg:flex items-center gap-1'>
                <p className='text-[11px] font-bold text-slate-700 uppercase tracking-wider'>{userData.name.split(' ')[0]}</p>
                <CaretDown size={12} weight="bold" className='text-slate-400 group-hover:rotate-180 transition-transform' />
              </div>

              {/* DESKTOP DROPDOWN */}
              <div className='absolute top-full right-0 pt-4 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-50'>
                <div className='min-w-64 bg-white border border-slate-100 rounded-[24px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.08)]'>
                  <div onClick={() => navigate('/my-profile')} className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all'>
                    <UserGear size={20} weight="duotone" className="text-slate-400" />
                    <span className='text-xs font-bold text-slate-600'>Medical Profile</span>
                  </div>
                  <div onClick={() => navigate('/my-appointments')} className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all'>
                    <CalendarCheck size={20} weight="duotone" className="text-slate-400" />
                    <span className='text-xs font-bold text-slate-600'>My Appointments</span>
                  </div>
                  <div onClick={logout} className='flex items-center gap-3 px-4 py-3 hover:bg-rose-50 rounded-xl transition-all mt-1 border-t border-slate-50'>
                    <SignOut size={20} weight="duotone" className="text-rose-500" />
                    <span className='text-xs font-bold text-rose-500'>Sign Out</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className='hidden md:flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[2px] hover:bg-teal-600 transition shadow-lg'
            >
              Patient Portal
            </button>
          )}

          {/* BURGER ICON */}
          <div onClick={() => setShowMenu(true)} className='md:hidden p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer'>
            <List size={24} weight="bold" className="text-slate-900" />
          </div>
        </div>

        {/* MOBILE MENU OVERLAY */}
        <AnimatePresence>
          {showMenu && (
            <>
              {/* Dark backdrop to isolate the menu */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMenu(false)}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] md:hidden"
              />
              
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className='fixed top-0 right-0 bottom-0 w-[85%] max-w-[400px] z-[70] bg-white shadow-2xl md:hidden flex flex-col'
              >
                {/* Mobile Header */}
                <div className='flex items-center justify-between px-6 py-6 border-b border-slate-50'>
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center'>
                      <span className='text-teal-600 font-black text-lg'>+</span>
                    </div>
                    <span className='font-black text-slate-900 tracking-tighter'>ADJ's CODEs</span>
                  </div>
                  <div onClick={() => setShowMenu(false)} className='p-2 bg-slate-100 rounded-xl cursor-pointer'>
                    <X size={24} weight="bold" className="text-slate-900" />
                  </div>
                </div>

                {/* Nav Links */}
                <div className='flex-1 overflow-y-auto py-8 px-8'>
                  <ul className='flex flex-col gap-6'>
                    {['HOME', 'DOCTORS', 'ABOUT', 'CONTACT'].map((item) => (
                      <NavLink key={item} onClick={() => setShowMenu(false)} to={item === 'HOME' ? '/' : `/${item.toLowerCase()}`}>
                        <li className='text-3xl font-black tracking-tighter text-slate-900 uppercase'>
                          {item}
                        </li>
                      </NavLink>
                    ))}
                  </ul>

                  {/* Profile Section */}
                  <div className='mt-12 pt-8 border-t border-slate-100'>
                    {token && userData ? (
                      <div className='flex flex-col gap-5'>
                        <p className='text-[10px] font-black text-teal-600 uppercase tracking-widest'>Patient Account</p>
                        <div onClick={() => {navigate('/my-profile'); setShowMenu(false)}} className='flex items-center gap-4 py-2 cursor-pointer'>
                          <UserGear size={28} weight="duotone" className="text-slate-400" />
                          <span className='text-lg font-bold text-slate-700'>My Profile</span>
                        </div>
                        <div onClick={() => {navigate('/my-appointments'); setShowMenu(false)}} className='flex items-center gap-4 py-2 cursor-pointer'>
                          <CalendarCheck size={28} weight="duotone" className="text-slate-400" />
                          <span className='text-lg font-bold text-slate-700'>Appointments</span>
                        </div>
                        <button onClick={logout} className='mt-4 flex items-center justify-center gap-3 bg-rose-50 text-rose-600 p-4 rounded-2xl font-black uppercase tracking-widest text-xs'>
                          <SignOut size={20} weight="bold" /> Sign Out
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => {navigate('/login'); setShowMenu(false)}} className='w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg'>
                        Patient Portal Login
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className='p-8 bg-slate-50'>
                  <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1'>Health Hotline</p>
                  <p className='text-xl font-bold text-slate-900'>(+234) 704 203 0981</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navbar