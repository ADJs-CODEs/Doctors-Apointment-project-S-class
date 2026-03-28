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
              <img className='w-8 h-8 md:w-9 md:h-9 rounded-xl border border-slate-100 object-cover bg-white' src={userData.image} alt="Profile" />
              <div className='hidden lg:flex items-center gap-1'>
                <p className='text-[11px] font-bold text-slate-700 uppercase tracking-wider'>{userData.name.split(' ')[0]}</p>
                <CaretDown size={12} weight="bold" className='text-slate-400 group-hover:rotate-180 transition-transform' />
              </div>
            </div>
          ) : (
            <button onClick={() => handleNav('/login')} className='hidden md:block bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[2px]'>Patient Portal</button>
          )}

          {/* Mobile Trigger */}
          <div onClick={() => setShowMenu(true)} className='md:hidden p-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer active:scale-90 transition-transform'>
            <List size={22} weight="bold" className="text-slate-900" />
          </div>
        </div>

        {/* --- MOBILE MENU --- */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-[999] bg-[#0F172A] w-screen h-screen flex flex-col md:hidden'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-6 py-6 border-b border-slate-800 bg-[#0F172A] sticky top-0'>
                <div className='flex items-center gap-2'>
                  <div className='w-8 h-8 bg-teal-500/10 rounded-full flex items-center justify-center border border-teal-500/20'>
                    <span className='text-teal-500 font-black'>+</span>
                  </div>
                  <span className='font-black text-white tracking-tighter uppercase text-sm'>ADJ's CODEs</span>
                </div>
                <div onClick={() => setShowMenu(false)} className='p-2 bg-slate-800 rounded-xl text-white cursor-pointer active:scale-95'>
                  <X size={24} weight="bold" />
                </div>
              </div>

              {/* Scrollable Content */}
              <div className='flex-1 overflow-y-auto px-8 py-10'>
                {/* Navigation */}
                <p className='text-[9px] font-black text-teal-500 uppercase tracking-[4px] mb-8 opacity-50'>Menu</p>
                <ul className='flex flex-col gap-5 mb-12'>
                  {['HOME', 'DOCTORS', 'ABOUT', 'CONTACT'].map((item) => (
                    <li
                      key={item}
                      onClick={() => handleNav(item === 'HOME' ? '/' : `/${item.toLowerCase()}`)}
                      className='text-3xl font-black text-white tracking-tight uppercase cursor-pointer'
                    >
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Account Section */}
                {token && (
                  <>
                    <p className='text-[9px] font-black text-teal-500 uppercase tracking-[4px] mb-8 opacity-50'>Dashboard</p>
                    <div className='flex flex-col gap-8'>
                      <button onClick={() => handleNav('/my-profile')} className='flex items-center gap-4 text-slate-300 font-bold text-lg text-left'>
                        <UserGear size={24} className="text-teal-500" /> My Info
                      </button>
                      <button onClick={() => handleNav('/my-appointments')} className='flex items-center gap-4 text-slate-300 font-bold text-lg text-left'>
                        <CalendarCheck size={24} className="text-teal-500" /> Appointments
                      </button>
                      <button onClick={() => handleNav('/account-settings')} className='flex items-center gap-4 text-slate-300 font-bold text-lg text-left'>
                        <Fingerprint size={24} className="text-teal-500" /> Privacy
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Fixed Actions */}
              <div className='p-6 bg-[#161e33] border-t border-slate-800'>
                <button
                  onClick={() => handleNav('/doctors')}
                  className='w-full bg-teal-500 text-slate-900 py-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest'
                >
                  Start Consultation <ArrowUpRight size={18} weight="bold" />
                </button>
                {token && (
                  <button onClick={logout} className='w-full mt-5 text-rose-500 font-black uppercase text-[10px] tracking-[2px] opacity-80'>
                    Logout Account
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navbar;