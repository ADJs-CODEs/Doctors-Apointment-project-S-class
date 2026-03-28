import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext.js'
import { NavLink } from 'react-router-dom';
import { DoctorContext } from '../context/DoctorContext.js';
import { AppContext } from '../context/AppContext.js'; // Added for progress
import {
  RiDashboard3Line,
  RiCalendarCheckLine,
  RiUserAddLine,
  RiGroupLine,
  RiUser3Line,
  RiSettings4Line
} from '@remixicon/react';
import type { AdminContextType, DoctorContextType, AppContextType } from '../types/index.js';

const Sidebar: React.FC = () => {
  const { aToken } = useContext(AdminContext) as AdminContextType;
  const { dToken } = useContext(DoctorContext) as DoctorContextType;
  const { setProgress } = useContext(AppContext) as AppContextType;

  // Refined style variables - Added active:scale for mobile responsiveness
  const activeClass = "bg-slate-900 text-white shadow-xl lg:translate-x-2";
  const inactiveClass = "text-slate-500 hover:bg-slate-50 hover:text-slate-900";
  const baseClass = "flex items-center gap-4 py-3 md:py-4 px-4 md:px-6 cursor-pointer transition-all duration-300 rounded-2xl mx-1 md:mx-4 mb-2 group active:scale-95";

  const handleLinkClick = () => {
    setProgress(40);
    setTimeout(() => setProgress(100), 500);
  };

  return (
    /* RESPONSIVE LOGIC:
      - Mobile/Tablet: Horizontal scrollable bar at the top, width is 100%.
      - Large Screens (lg): Vertical sticky sidebar with 72 (288px) width.
    */
    <div className='w-full lg:w-72 bg-white border-b lg:border-r border-slate-100 py-4 lg:py-10 shrink-0 sticky top-[72px] lg:min-h-screen z-40 overflow-x-auto lg:overflow-x-visible'>

      <div className='flex lg:flex-col items-center lg:items-stretch min-w-max lg:min-w-full px-4 lg:px-0'>

        {/* --- Admin Section --- */}
        {aToken && (
          <div className='animate-reveal flex lg:flex-col items-center lg:items-stretch'>
            <p className='hidden lg:block text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-8 px-10'>
              Management
            </p>

            <ul className='flex lg:flex-col space-x-1 lg:space-x-0 lg:space-y-1'>
              <NavLink onClick={handleLinkClick} className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/admin-dashboard'}>
                <RiDashboard3Line size={22} className='shrink-0 group-hover:text-teal-500 transition-colors' />
                <p className='hidden lg:block text-[11px] font-black uppercase tracking-widest'>Dashboard</p>
              </NavLink>

              <NavLink onClick={handleLinkClick} className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/all-appointments'}>
                <RiCalendarCheckLine size={22} className='shrink-0 group-hover:text-teal-500 transition-colors' />
                <p className='hidden lg:block text-[11px] font-black uppercase tracking-widest'>Appointments</p>
              </NavLink>

              <NavLink onClick={handleLinkClick} className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/add-doctor'}>
                <RiUserAddLine size={22} className='shrink-0 group-hover:text-teal-500 transition-colors' />
                <p className='hidden lg:block text-[11px] font-black uppercase tracking-widest'>Add Doctor</p>
              </NavLink>

              <NavLink onClick={handleLinkClick} className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/doctor-list'}>
                <RiGroupLine size={22} className='shrink-0 group-hover:text-teal-500 transition-colors' />
                <p className='hidden lg:block text-[11px] font-black uppercase tracking-widest'>Registry</p>
              </NavLink>
            </ul>
          </div>
        )}

        {/* --- Doctor Section --- */}
        {dToken && (
          <div className='animate-reveal flex lg:flex-col items-center lg:items-stretch'>
            <p className='hidden lg:block text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-8 px-10'>
              Medical Portal
            </p>

            <ul className='flex lg:flex-col space-x-1 lg:space-x-0 lg:space-y-1'>
              <NavLink onClick={handleLinkClick} className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/doctor-dashboard'}>
                <RiDashboard3Line size={22} className='shrink-0 group-hover:text-indigo-500 transition-colors' />
                <p className='hidden lg:block text-[11px] font-black uppercase tracking-widest'>Overview</p>
              </NavLink>

              <NavLink onClick={handleLinkClick} className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/doctor-appointments'}>
                <RiCalendarCheckLine size={22} className='shrink-0 group-hover:text-indigo-500 transition-colors' />
                <p className='hidden lg:block text-[11px] font-black uppercase tracking-widest'>Schedule</p>
              </NavLink>

              <NavLink onClick={handleLinkClick} className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/doctor-profile'}>
                <RiUser3Line size={22} className='shrink-0 group-hover:text-indigo-500 transition-colors' />
                <p className='hidden lg:block text-[11px] font-black uppercase tracking-widest'>My Profile</p>
              </NavLink>
            </ul>
          </div>
        )}

        {/* --- System Footer Settings --- */}
        <div className='lg:absolute lg:bottom-10 lg:w-full px-2 lg:px-4 ml-auto lg:ml-0'>
          <button onClick={handleLinkClick} className='flex items-center gap-4 py-3 lg:py-4 px-4 lg:px-6 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all group active:scale-95'>
            <RiSettings4Line size={22} className='group-hover:rotate-45 transition-transform duration-500' />
            <p className='hidden lg:block text-[11px] font-black uppercase tracking-widest'>Settings</p>
          </button>
        </div>

      </div>
    </div>
  )
}

export default Sidebar