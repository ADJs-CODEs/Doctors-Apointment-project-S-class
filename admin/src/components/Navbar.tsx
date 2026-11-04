"use client";

import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext'
import { useNavigate } from "@/lib/navigation"
import { DoctorContext } from '../context/DoctorContext'
import { RiShieldUserLine, RiStethoscopeLine, RiStore2Line } from '@remixicon/react'
import type { AdminContextType, DoctorContextType } from '../types/index'
import DoctorBell from './DoctorBell'
import { usePharmacy } from '../context/PharmacyContext'

/** The panel's top bar: the product name, who's logged in, and (for doctors) their bell. */
const Navbar: React.FC = () => {
  const { aToken } = useContext(AdminContext) as AdminContextType
  const { dToken } = useContext(DoctorContext) as DoctorContextType
  const { pToken, staff } = usePharmacy()
  const navigate = useNavigate()

  const role = aToken
    ? { label: 'Clinic team', Icon: RiShieldUserLine }
    : dToken
      ? { label: 'Doctor', Icon: RiStethoscopeLine }
      : pToken
        ? { label: staff?.role === 'pharmacist' ? 'Pharmacist' : staff?.role === 'owner' ? 'Pharmacy owner' : 'Pharmacy', Icon: RiStore2Line }
        : null

  const home = aToken ? '/admin-dashboard' : dToken ? '/doctor-dashboard' : '/pharmacy'

  return (
    <nav className='sticky top-0 z-50 h-[68px] px-3 lg:px-3 pt-3'>
      <div className='glass h-full rounded-[18px] flex items-center justify-between gap-3 pl-4 pr-2.5'>
        <button type='button' onClick={() => navigate(home)} className='flex items-baseline gap-2 shrink-0'>
          <b className='text-[20px] font-extrabold tracking-[-0.5px] text-ink'>Clarity</b>
          <span className='hidden sm:inline text-[12px] font-semibold text-ink-3'>clinic panel</span>
        </button>

        <div className='flex items-center gap-2'>
          {role && (
            <span className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-line text-[13px] font-bold text-ink-2'>
              <role.Icon size={15} className='text-brand-ink' />
              {role.label}
            </span>
          )}
          {dToken && <DoctorBell />}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
