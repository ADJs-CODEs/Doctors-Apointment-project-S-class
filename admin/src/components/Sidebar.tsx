import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext.js'
import { NavLink } from 'react-router-dom';
import { DoctorContext } from '../context/DoctorContext.js';
import {
  RiDashboard3Line,
  RiCalendarCheckLine,
  RiUserAddLine,
  RiGroupLine,
  RiUser3Line,
  RiSettings4Line
} from '@remixicon/react';
import type { AdminContextType, DoctorContextType } from '../types/index.js';

const Sidebar: React.FC = () => {
  const { aToken } = useContext(AdminContext) as AdminContextType;
  const { dToken } = useContext(DoctorContext) as DoctorContextType;

  // Refined style variables for v4 compatibility
  const activeClass = "bg-slate-900 text-white shadow-xl translate-x-2";
  const inactiveClass = "text-slate-500 hover:bg-slate-50 hover:text-slate-900";
  const baseClass = "flex items-center gap-4 py-4 px-6 cursor-pointer transition-all duration-300 rounded-2xl mx-4 mb-2 group";

  return (
    <div className='min-h-screen bg-white border-r border-slate-100 py-10 w-[80px] md:w-72 shrink-0 sticky top-[72px]'>

      {/* --- Admin Section --- */}
      {aToken && (
        <div className='animate-reveal'>
          <p className='hidden md:block text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-8 px-10'>
            Management
          </p>

          <ul className='space-y-1'>
            <NavLink className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/admin-dashboard'}>
              <RiDashboard3Line size={22} className='shrink-0 group-hover:text-teal-500 transition-colors' />
              <p className='hidden md:block text-[11px] font-black uppercase tracking-widest'>Dashboard</p>
            </NavLink>

            <NavLink className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/all-appointments'}>
              <RiCalendarCheckLine size={22} className='shrink-0 group-hover:text-teal-500 transition-colors' />
              <p className='hidden md:block text-[11px] font-black uppercase tracking-widest'>Appointments</p>
            </NavLink>

            <NavLink className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/add-doctor'}>
              <RiUserAddLine size={22} className='shrink-0 group-hover:text-teal-500 transition-colors' />
              <p className='hidden md:block text-[11px] font-black uppercase tracking-widest'>Add Doctor</p>
            </NavLink>

            <NavLink className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/doctor-list'}>
              <RiGroupLine size={22} className='shrink-0 group-hover:text-teal-500 transition-colors' />
              <p className='hidden md:block text-[11px] font-black uppercase tracking-widest'>Registry</p>
            </NavLink>
          </ul>
        </div>
      )}

      {/* --- Doctor Section --- */}
      {dToken && (
        <div className='animate-reveal'>
          <p className='hidden md:block text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-8 px-10'>
            Medical Portal
          </p>

          <ul className='space-y-1'>
            <NavLink className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/doctor-dashboard'}>
              <RiDashboard3Line size={22} className='shrink-0 group-hover:text-indigo-500 transition-colors' />
              <p className='hidden md:block text-[11px] font-black uppercase tracking-widest'>Overview</p>
            </NavLink>

            <NavLink className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/doctor-appointments'}>
              <RiCalendarCheckLine size={22} className='shrink-0 group-hover:text-indigo-500 transition-colors' />
              <p className='hidden md:block text-[11px] font-black uppercase tracking-widest'>Schedule</p>
            </NavLink>

            <NavLink className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`} to={'/doctor-profile'}>
              <RiUser3Line size={22} className='shrink-0 group-hover:text-indigo-500 transition-colors' />
              <p className='hidden md:block text-[11px] font-black uppercase tracking-widest'>My Profile</p>
            </NavLink>
          </ul>
        </div>
      )}

      {/* --- System Footer --- */}
      <div className='absolute bottom-10 w-full px-4'>
        <button className='w-full flex items-center gap-4 py-4 px-6 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all group'>
          <RiSettings4Line size={22} className='group-hover:rotate-45 transition-transform duration-500' />
          <p className='hidden md:block text-[11px] font-black uppercase tracking-widest'>Settings</p>
        </button>
      </div>
    </div>
  )
}

export default Sidebar