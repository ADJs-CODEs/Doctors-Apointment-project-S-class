import React, { useContext, useState } from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
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
  Fingerprint,
  ArrowUpRight
} from "@phosphor-icons/react";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { token, setToken, userData, setProgress } = useContext(AppContext) as AppContextType;
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const logout = () => {
    setProgress(30);
    setToken('');
    localStorage.removeItem('token');
    setShowMenu(false);
    setTimeout(() => {
      setProgress(100);
      navigate('/login');
    }, 400);
  }

  const handleNav = (path: string) => {
    setProgress(40);
    setShowMenu(false);
    navigate(path);
    window.scrollTo(0, 0);
    setTimeout(() => setProgress(100), 500);
  }

  const activeClass = "relative py-1 text-teal-600 font-bold after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-0.5 after:bg-teal-500 after:rounded-full transition-all duration-500";
  const normalClass = "py-1 text-slate-500 font-bold hover:text-teal-600 transition-all duration-300";

  return (
    <nav className='sticky top-0 z-50 py-3 md:py-4 px-4 md:px-10 bg-white md:bg-white/70 backdrop-blur-xl border-b border-slate-100 md:mt-4 md:mx-4 md:rounded-[28px] shadow-sm'>
      <div className='max-w-7xl mx-auto flex items-center justify-between'>

        {/* --- LOGO --- */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={() => handleNav('/')}
          className='flex items-center gap-2 md:gap-3 cursor-pointer'
        >
          <div className='w-9 h-9 md:w-11 md:h-11 bg-teal-50 rounded-full border-2 border-dotted border-teal-200 flex items-center justify-center shrink-0'>
            <div className='text-teal-600 font-black text-xl md:text-2xl leading-none'>+</div>
          </div>

          <div className='flex flex-col leading-tight'>
            <span className='text-[14px] md:text-[19px] font-black text-slate-800 tracking-tighter uppercase'>
              ADJ's <span className='text-teal-600'>CODEs</span>
            </span>
            <span className='text-[7px] md:text-[9.5px] font-bold text-slate-400 uppercase tracking-[2px] md:tracking-[2.5px] -mt-0.5 md:-mt-1'>
              Pharmaceutical
            </span>
          </div>
        </motion.div>

        {/* Desktop Menu */}
        <ul className='hidden md:flex items-center gap-10 text-[11px] tracking-[2px] font-bold'>
          {['HOME', 'DOCTORS', 'ABOUT', 'CONTACT'].map((item) => (
            <NavLink
              key={item}
              to={item === 'HOME' ? '/' : `/${item.toLowerCase()}`}
              onClick={() => setProgress(100)}
            >
              {({ isActive }) => (
                <li className={isActive ? activeClass : normalClass}>{item}</li>
              )}
            </NavLink>
          ))}
        </ul>

        {/* Right Section */}
        <div className='flex items-center gap-3'>
          {token && userData ? (
            <div className='flex items-center gap-3 cursor-pointer group relative p-1'>
              <div className='relative isolate'>
                <div className='absolute -inset-1 bg-teal-500/10 rounded-full blur-sm group-hover:bg-teal-500/20 transition duration-500'></div>
                <img className='w-8 h-8 md:w-9 md:h-9 rounded-xl border border-slate-100 relative z-10 object-cover bg-white shadow-sm' src={userData.image.replace('/upload/', '/upload/f_jpg,q_auto:best/')} alt="Profile" />
              </div>

              <div className='hidden lg:flex items-center gap-1'>
                <p className='text-[11px] font-bold text-slate-700 uppercase tracking-wider'>{userData.name.split(' ')[0]}</p>
                <CaretDown size={12} weight="bold" className='text-slate-400 group-hover:rotate-180 transition-transform' />
              </div>

              {/* Desktop Dropdown Only */}
              <div className='absolute top-full right-0 pt-4 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50 hidden md:block'>
                <div className='min-w-64 bg-white border border-slate-100 rounded-[24px] p-2 shadow-xl'>
                  <div onClick={() => handleNav('/my-profile')} className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group/item'><UserGear size={20} weight="duotone" className="text-slate-400 group-hover/item:text-teal-600" /><span className='text-xs font-bold text-slate-600'>Medical Profile</span></div>
                  <div onClick={() => handleNav('/my-appointments')} className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group/item'><CalendarCheck size={20} weight="duotone" className="text-slate-400 group-hover/item:text-teal-600" /><span className='text-xs font-bold text-slate-600'>My Appointments</span></div>
                  <div onClick={() => handleNav('/account-settings')} className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group/item'><Fingerprint size={20} weight="duotone" className="text-slate-400 group-hover/item:text-teal-600" /><span className='text-xs font-bold text-slate-600'>Security</span></div>
                  <div className='h-[1px] bg-slate-50 my-1 mx-2' />
                  <div onClick={logout} className='flex items-center gap-3 px-4 py-3 hover:bg-rose-50 rounded-xl text-rose-500 transition-all'><SignOut size={20} weight="duotone" /><span className='text-xs font-bold'>Sign Out</span></div>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => handleNav('/login')} className='hidden md:block bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[2px]'>Patient Portal</button>
          )}

          {/* Mobile Menu Trigger */}
          <div onClick={() => setShowMenu(true)} className='md:hidden p-2 bg-slate-50 rounded-xl border border-slate-100 active:scale-90 transition-transform'>
            <List size={22} weight="bold" className="text-slate-900" />
          </div>
        </div>

        {/* Mobile Fullscreen Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className='fixed inset-0 z-[70] bg-[#0F172A] flex flex-col md:hidden overflow-y-auto'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-6 py-6 border-b border-slate-800/50'>
                <div className='flex items-center gap-2'>
                  <div className='w-8 h-8 bg-teal-500/10 rounded-full flex items-center justify-center border border-teal-500/20'>
                    <span className='text-teal-500 font-black'>+</span>
                  </div>
                  <span className='font-black text-white tracking-tighter uppercase text-sm'>ADJ's CODEs</span>
                </div>
                <div onClick={() => setShowMenu(false)} className='p-2 bg-slate-800 rounded-xl active:scale-90 text-white'>
                  <X size={24} weight="bold" />
                </div>
              </div>

              {/* Navigation Links - Scaled down for readability */}
              <ul className='flex flex-col gap-1 mt-6 px-4'>
                {['HOME', 'DOCTORS', 'ABOUT', 'CONTACT'].map((item) => (
                  <li
                    key={item}
                    onClick={() => handleNav(item === 'HOME' ? '/' : `/${item.toLowerCase()}`)}
                    className='text-3xl font-black tracking-tight text-slate-500 hover:text-white px-4 py-3 transition-colors uppercase'
                  >
                    {item}
                  </li>
                ))}
              </ul>

              {/* Account Section */}
              <div className='px-8 py-10 flex flex-col gap-5 mt-4 border-t border-slate-800/50 bg-slate-900/30'>
                <p className='text-[10px] font-black text-teal-500/50 uppercase tracking-[3px] mb-2'>Patient Dashboard</p>

                {token ? (
                  <>
                    <div onClick={() => handleNav('/my-profile')} className='flex items-center gap-4 text-slate-300 font-bold active:text-teal-400'><UserGear size={24} weight="duotone" className="text-teal-500" /> Medical Profile</div>
                    <div onClick={() => handleNav('/my-appointments')} className='flex items-center gap-4 text-slate-300 font-bold active:text-teal-400'><CalendarCheck size={24} weight="duotone" className="text-teal-500" /> My Appointments</div>

                    {/* Consult Button */}
                    <button onClick={() => handleNav('/doctors')} className='mt-4 w-full bg-teal-500 text-slate-900 py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-lg shadow-teal-500/20'>
                      Start Consultation <ArrowUpRight size={18} weight="bold" />
                    </button>

                    <button onClick={logout} className='mt-6 flex items-center gap-3 text-rose-500 font-black uppercase text-[10px] tracking-[2px] active:opacity-70 transition-opacity'><SignOut size={20} weight="duotone" /> Sign Out Account</button>
                  </>
                ) : (
                  <button onClick={() => handleNav('/login')} className='w-full bg-white text-slate-900 py-4 rounded-2xl font-black uppercase text-xs tracking-widest'>Login to Portal</button>
                )}
              </div>

              {/* Footer Info */}
              <div className='mt-auto p-8 bg-slate-900/50 border-t border-slate-800/50'>
                <p className='text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1'>Clinical Support</p>
                <p className='text-lg font-bold text-white tracking-tight'>(+234) 704 203 0981</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navbar