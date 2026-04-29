import React, { useContext, useState, useEffect } from 'react'
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
  ShieldCheck,
  Fingerprint,
  ArrowUpRight
} from "@phosphor-icons/react";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { token, setToken, userData } = useContext(AppContext) as AppContextType;
  const [showMenu, setShowMenu] = useState<boolean>(false);

  // Lock scroll when mobile menu is active
  useEffect(() => {
    if (showMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showMenu]);

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
    setShowMenu(false); // Close menu on logout
    navigate('/login');
  }

  const handleMobileNav = (path: string) => {
    setShowMenu(false);
    navigate(path);
    window.scrollTo(0, 0);
  }

  const activeClass = "relative py-1 text-teal-600 font-bold after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-0.5 after:bg-teal-500 after:rounded-full transition-all duration-500";
  const normalClass = "py-1 text-slate-500 font-bold hover:text-teal-600 transition-all duration-300";

  return (
    <nav className='sticky top-0 z-50 py-4 px-6 md:px-10 bg-white/70 backdrop-blur-xl border-b border-slate-100 md:mt-4 md:mx-4 md:rounded-[28px] shadow-sm'>
      <div className='max-w-7xl mx-auto flex items-center justify-between'>

        {/* --- DESKTOP LOGO & LOGIC --- */}
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

        {/* --- DESKTOP MENU --- */}
        <ul className='hidden md:flex items-center gap-10 text-[11px] tracking-[2px] font-bold'>
          {['HOME', 'DOCTORS', 'ABOUT', 'CONTACT'].map((item) => (
            <NavLink
              key={item}
              to={item === 'HOME' ? '/' : `/${item.toLowerCase()}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {({ isActive }) => (
                <li className={isActive ? activeClass : normalClass}>{item}</li>
              )}
            </NavLink>
          ))}
        </ul>

        {/* --- DESKTOP RIGHT SECTION & HOVER LOGIC (UNTOUCHED) --- */}
        <div className='flex items-center gap-6'>
          {token && userData ? (
            <div className='flex items-center gap-3 cursor-pointer group relative'>
              <div className='relative isolate'>
                <div
                  style={{ backfaceVisibility: 'hidden', imageRendering: 'auto', filter: 'none', WebkitFilter: 'none', willChange: 'transform', transform: 'translateZ(0)' }}
                  className='absolute -inset-1 bg-teal-500/10 rounded-full blur-sm group-hover:bg-teal-500/20 transition duration-500'></div>
                <img className='w-9 h-9 rounded-xl border border-slate-100 relative z-10 object-cover bg-white transform-gpu shadow-sm' src={userData.image.replace('/upload/', '/upload/f_jpg,q_auto:best/')} alt="Profile" />
              </div>

              <div className='hidden lg:flex items-center gap-1'>
                <p className='text-[11px] font-bold text-slate-700 uppercase tracking-wider'>{userData.name.split(' ')[0]}</p>
                <CaretDown size={12} weight="bold" className='text-slate-400 group-hover:rotate-180 transition-transform' />
              </div>

              <div className='absolute top-full right-0 pt-4 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-50'>
                <div className='min-w-64 bg-white border border-slate-100 rounded-[24px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.08)]'>
                  <div onClick={() => { navigate('/my-profile'); window.scrollTo(0, 0) }} className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group/item'>
                    <UserGear size={20} weight="duotone" className="text-slate-400 group-hover/item:text-teal-600" />
                    <span className='text-xs font-bold text-slate-600'>Medical Profile</span>
                  </div>
                  <div onClick={() => { navigate('/my-appointments'); window.scrollTo(0, 0) }} className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group/item'>
                    <CalendarCheck size={20} weight="duotone" className="text-slate-400 group-hover/item:text-teal-600" />
                    <span className='text-xs font-bold text-slate-600'>My Appointments</span>
                  </div>
                  <div onClick={() => { navigate('/account-settings'); window.scrollTo(0, 0) }} className='flex items-center gap-3 px-4 py-3 hover:bg-teal-50/50 rounded-xl transition-all group/item'>
                    <Fingerprint size={20} weight="duotone" className="text-slate-400 group-hover/item:text-teal-600" />
                    <span className='text-xs font-bold text-slate-600'>Security & Credentials</span>
                  </div>
                  <div className='h-px bg-slate-50 my-1 mx-2' />
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

          <div onClick={() => setShowMenu(true)} className='md:hidden p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer active:scale-90 transition-all'>
            <List size={24} weight="bold" className="text-slate-900" />
          </div>
        </div>

        {/* --- MOBILE MENU --- */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className='fixed inset-0 z-[100] bg-white md:hidden flex flex-col h-screen w-screen overflow-hidden'
            >
              {/* Mobile Header */}
              <div className='flex items-center justify-between px-8 py-8 border-b border-slate-50 shrink-0'>
                <div className='flex items-center gap-2'>
                  <div className='w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center'>
                    <span className='text-teal-600 font-black text-lg'>+</span>
                  </div>
                  <span className='font-black text-slate-900 tracking-tighter uppercase text-sm'>ADJ's CODEs</span>
                </div>
                <div onClick={() => setShowMenu(false)} className='p-2.5 bg-slate-50 rounded-xl cursor-pointer active:scale-95'>
                  <X size={24} weight="bold" className="text-slate-900" />
                </div>
              </div>

              {/* Scrollable Mobile Content */}
              <div className='flex-1 overflow-y-auto px-10 py-8'>
                {/* Main Nav Links */}
                <p className='text-[9px] font-black text-teal-600 uppercase tracking-[4px] mb-6 opacity-60'>Navigation</p>
                <ul className='flex flex-col gap-6 mb-12'>
                  {['HOME', 'DOCTORS', 'ABOUT', 'CONTACT'].map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleMobileNav(item === 'HOME' ? '/' : `/${item.toLowerCase()}`)}
                      className='text-4xl font-black text-slate-800 tracking-tighter uppercase'
                    >
                      {item}
                    </motion.li>
                  ))}
                </ul>

                {/* Dashboard Section (Conditional) */}
                {token && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className='text-[9px] font-black text-teal-600 uppercase tracking-[4px] mb-6 opacity-60'>Medical Dashboard</p>
                    <div className='flex flex-col gap-7'>
                      <button onClick={() => handleMobileNav('/my-profile')} className='flex items-center gap-4 text-slate-700 font-bold text-xl'>
                        <UserGear size={28} weight="duotone" className="text-teal-500" /> Medical Profile
                      </button>
                      <button onClick={() => handleMobileNav('/my-appointments')} className='flex items-center gap-4 text-slate-700 font-bold text-xl'>
                        <CalendarCheck size={28} weight="duotone" className="text-teal-500" /> My Appointments
                      </button>
                      <button onClick={() => handleMobileNav('/account-settings')} className='flex items-center gap-4 text-slate-700 font-bold text-xl'>
                        <Fingerprint size={28} weight="duotone" className="text-teal-500" /> Security & Credentials
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Mobile Bottom Actions */}
              <div className='p-8 bg-slate-50 border-t border-slate-100 shrink-0'>
                {!token ? (
                  <button
                    onClick={() => handleMobileNav('/login')}
                    className='w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest'
                  >
                    Patient Portal login
                  </button>
                ) : (
                  <button
                    onClick={logout}
                    className='w-full bg-rose-50 text-rose-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2'
                  >
                    <SignOut size={18} weight="bold" /> Sign Out Account
                  </button>
                )}
                <div className='mt-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[2px]'>
                  Hotline: (+234) 704 203 0981
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navbar