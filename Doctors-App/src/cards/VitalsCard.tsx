import React from 'react'
import type { VitalsProps } from '../types/index.js'
import { RiHeartPulseLine, RiDashboardLine, RiTempHotLine } from "@remixicon/react"

const VitalsCard: React.FC<VitalsProps> = ({ latestAppointment }) => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-10'>
      <div className='glass-card-premium p-6 rounded-[35px] border-b-4 border-rose-500'>
        <div className='flex items-center gap-3 mb-3'>
          <RiHeartPulseLine className='text-rose-500' size={20} />
          <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>Heart Rate</p>
        </div>
        <p className='text-3xl font-black text-slate-900'>
          {latestAppointment?.healthData?.heartRate || '--'} <span className='text-xs text-slate-400 font-bold'>BPM</span>
        </p>
      </div>

      <div className='glass-card-premium p-6 rounded-[35px] border-b-4 border-blue-500'>
        <div className='flex items-center gap-3 mb-3'>
          <RiDashboardLine className='text-blue-500' size={20} />
          <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>Blood Pressure</p>
        </div>
        <p className='text-3xl font-black text-slate-900'>
          {latestAppointment?.healthData?.bloodPressure || '--'}
        </p>
      </div>

      <div className='glass-card-premium p-6 rounded-[35px] border-b-4 border-orange-500'>
        <div className='flex items-center gap-3 mb-3'>
          <RiTempHotLine className='text-orange-500' size={20} />
          <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>Temperature</p>
        </div>
        <p className='text-3xl font-black text-slate-900'>
          {latestAppointment?.healthData?.temperature || '--'} <span className='text-xs text-slate-400 font-bold'>°C</span>
        </p>
      </div>
    </div>

  )
}

export default VitalsCard
