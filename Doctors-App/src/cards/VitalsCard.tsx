"use client";

import React from 'react'
import type { VitalsProps } from '../types/index'
import { RiHeartPulseLine, RiDashboardLine, RiTempHotLine } from "@remixicon/react"
import IconTile from '../components/brand/IconTile'
import { formatVisitDate } from '../utils/patientRecords'

/** The latest vitals a doctor recorded (heart rate, blood pressure, temperature) and who recorded them. */
const VitalsCard: React.FC<VitalsProps> = ({ latestAppointment }) => {
  const h = latestAppointment?.healthData
  const items = [
    { icon: <RiHeartPulseLine size={20} className='text-rose-500' />, label: 'Heart rate', value: h?.heartRate, unit: 'BPM' },
    { icon: <RiDashboardLine size={20} className='text-[#3554C4]' />, label: 'Blood pressure', value: h?.bloodPressure, unit: 'mmHg' },
    { icon: <RiTempHotLine size={20} className='text-amber-600' />, label: 'Temperature', value: h?.temperature, unit: '°C' },
  ]
  return (
    <section className='surface rounded-[24px] p-5 sm:p-6'>
      <h2 className='flex items-center gap-2.5 text-[16px] font-bold text-ink mb-4'>
        <IconTile>
          <RiHeartPulseLine size={17} />
        </IconTile>
        Latest vitals
      </h2>
      <div className='grid grid-cols-1 min-[420px]:grid-cols-3 gap-3'>
        {items.map((v) => (
          <div key={v.label} className='flex items-center gap-3.5 rounded-[16px] bg-canvas border border-line/70 p-4'>
            <span className='w-11 h-11 rounded-xl bg-white border border-line grid place-items-center shrink-0'>{v.icon}</span>
            <div>
              <p className='text-[13px] font-semibold text-ink-3'>{v.label}</p>
              <p className='num text-[21px] text-ink leading-tight'>
                {v.value || '--'} <span className='text-[12px] text-ink-3'>{v.value ? v.unit : ''}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className='text-[13px] text-ink-3 mt-3'>
        {latestAppointment
          ? `Recorded by ${latestAppointment.docData?.name} on ${formatVisitDate(latestAppointment)}.`
          : 'Your doctor records these during a visit.'}
      </p>
    </section>
  )
}

export default VitalsCard
