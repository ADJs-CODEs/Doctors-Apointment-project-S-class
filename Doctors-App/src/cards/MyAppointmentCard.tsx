import React from 'react'
import type { Appointment, MyAppointmentCardProps } from '../types/index.js';
import { RiErrorWarningLine, RiShieldCheckLine, RiArrowDownSLine } from "@remixicon/react"
import { slotDateFormat } from '../utils/medicationUtils.js';


const MyAppointmentCard: React.FC<MyAppointmentCardProps> = ({ item, isCritical, cancelAppointment, payStripe, onViewReport, isExpanded, toggleTracker }) => {

  return (
    <div className={`bg-white p-5 md:p-6 rounded-[32px] md:rounded-[40px] flex flex-col md:flex-row gap-6 md:gap-8 items-center shadow-sm border transition-all duration-500 ${isCritical ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.15)] bg-red-50/30' : 'border-slate-100'}`}>
      <div className='relative isolate shrink-0'>
        <img
          style={{
            imageRendering: 'auto',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)'
          }}
          className='w-24 h-24 md:w-32 md:h-32 rounded-[24px] md:rounded-[32px] object-cover bg-slate-100 border-4 border-white shadow-sm'
          src={item.docData?.image?.replace('/upload/', '/upload/f_jpg,q_auto:best,w_400,h_400,c_fill/')}
          alt=""
        />
        {isCritical && (
          <div className='absolute -top-1 -right-1 bg-red-600 text-white p-1.5 rounded-full animate-bounce shadow-lg'>
            <RiErrorWarningLine size={16} />
          </div>
        )}
      </div>

      <div className='flex-1 text-center md:text-left'>
        <div className='flex flex-col md:flex-row md:items-center gap-2 md:gap-3'>
          <p className='text-xl md:text-2xl font-black text-slate-900'>{item.docData?.name}</p>
          {isCritical && (
            <span className='bg-red-600 text-white text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest animate-pulse w-fit mx-auto md:mx-0'>
              Urgent Action
            </span>
          )}
        </div>
        <p className='text-teal-600 font-bold uppercase text-[9px] tracking-[2px] mt-1'>{item.docData?.speciality}</p>
        <p className='text-[10px] md:text-xs text-slate-500 font-medium mt-2 bg-slate-100 w-fit px-3 py-1 rounded-full mx-auto md:mx-0'>
          {slotDateFormat(item.slotDate)} | {item.slotTime}
        </p>
      </div>

      {/* Interactive Buttons */}
      <div className='flex flex-col gap-2 w-full md:w-auto min-w-[140px]'>
        {!item.cancelled && !item.isCompleted && !item.payment && (
          <button onClick={() => payStripe(item._id)} className='w-full px-6 py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs uppercase hover:bg-slate-800 active:scale-95 transition-all'>
            Pay Online
          </button>
        )}
        {item.payment && !item.isCompleted && (
          <div className='flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 text-teal-600 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-wider border border-teal-100'>
            <RiShieldCheckLine size={14} /> Paid Securely
          </div>
        )}
        {!item.cancelled && !item.isCompleted && (
          <button onClick={() => cancelAppointment(item._id)} className='w-full px-6 py-3 border border-slate-200 text-slate-400 rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs uppercase hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all'>
            Cancel
          </button>
        )}
        {item.cancelled && <button className='w-full px-6 py-3 border border-red-100 text-red-400 rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs uppercase cursor-not-allowed'>Cancelled</button>}

        {/* Visited Toggle Button */}
        {item.isCompleted && (
          <button
            onClick={() => toggleTracker(item._id)}
            className={`flex items-center justify-center gap-2 w-full px-6 py-3 border transition-all rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs uppercase active:scale-95 ${isExpanded ? 'bg-teal-500 text-white border-teal-500' : 'border-teal-100 text-teal-500'}`}
          >
            {isExpanded ? 'Close Details' : 'View Report'}
            <RiArrowDownSLine className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

export default MyAppointmentCard
