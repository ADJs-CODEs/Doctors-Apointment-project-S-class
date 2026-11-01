"use client";

import React, { useContext, useEffect, useState } from 'react'
import type { AppContextType, Appointment, MyAppointmentCardProps } from '../types/index';
import { AppContext } from '../Context/AppContext';
import { RiErrorWarningLine, RiShieldCheckLine, RiArrowDownSLine, RiCalendarCloseLine, RiVideoChatLine, RiTimerLine } from "@remixicon/react"
import { slotDateFormat } from '../utils/medicationUtils';
import MessageDoctorButton from '../components/patient/MessageDoctorButton';
import { DirectionsButton } from '../components/patient/ClinicMap';
import VideoCallPanel from '../components/patient/VideoCallPanel';


/** A time that's held but not paid for yet, with a live countdown. */
function HoldBadge({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])
  const mins = Math.max(0, Math.ceil((new Date(until).getTime() - now) / 60_000))
  return (
    <div className='px-4 py-3 rounded-xl md:rounded-2xl border border-amber-200 bg-amber-50 text-center'>
      <p className='flex items-center justify-center gap-1.5 font-black text-[9px] md:text-[10px] uppercase tracking-wider text-amber-700'>
        <RiTimerLine size={14} /> Awaiting payment
      </p>
      <p className='text-[11px] text-amber-800 mt-1 leading-snug'>
        {mins > 0 ? `Held for ${mins} more min. Pay to confirm.` : 'Hold expired. Book again.'}
      </p>
    </div>
  )
}

/** Missed appointment: whose miss it was and what happened to the money. */
function MissedBadge({ item }: { item: Appointment }) {
  const byPatient = item.missed?.by === 'patient'
  const refund = item.refund
  const { currencySymbol } = useContext(AppContext) as AppContextType
  return (
    <div className={`px-4 py-3 rounded-xl md:rounded-2xl border text-center ${byPatient ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'}`}>
      <p className={`flex items-center justify-center gap-1.5 font-black text-[9px] md:text-[10px] uppercase tracking-wider ${byPatient ? 'text-orange-600' : 'text-red-600'}`}>
        <RiCalendarCloseLine size={14} /> {byPatient ? 'Missed' : 'Doctor missed'}
      </p>
      {refund && (
        <p className='text-[11px] text-slate-600 mt-1 leading-snug'>
          {refund.percent}% refund ({currencySymbol}{refund.amount})
          <br />
          <span className={refund.status === 'refunded' ? 'text-teal-600 font-bold' : 'text-slate-400'}>
            {refund.status !== 'refunded' ? 'Being processed' : refund.method === 'wallet' ? 'Back in your wallet' : 'Sent to your card'}
          </span>
        </p>
      )}
    </div>
  )
}

const MyAppointmentCard: React.FC<MyAppointmentCardProps> = ({ item, isCritical, cancelAppointment, payStripe, onViewReport, isExpanded, toggleTracker }) => {
  // still to happen: not done, cancelled or missed
  const open = !item.cancelled && !item.isCompleted && !item.missed
  // picked but not paid yet: only held for a while
  const held = !!item.holdExpiresAt && !item.payment

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
        <div className='flex flex-wrap items-center gap-2 mt-2 justify-center md:justify-start'>
          <p className='text-[10px] md:text-xs text-slate-500 font-medium bg-slate-100 w-fit px-3 py-1 rounded-full'>
            {slotDateFormat(item.slotDate)} | {item.slotTime}
          </p>
          {item.kind === 'video' && (
            <span className='inline-flex items-center gap-1 text-[10px] md:text-xs font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-full'>
              <RiVideoChatLine size={13} /> Video call
            </span>
          )}
        </div>
        {/* video calls always say where they stand: pay, starts in…, live (join), ended */}
        {item.kind === 'video' && !held && <VideoCallPanel item={item} onPay={() => payStripe(item._id)} />}
      </div>

      {/* Interactive Buttons */}
      <div className='flex flex-col gap-2 w-full md:w-auto min-w-[140px]'>
        {item.missed && <MissedBadge item={item} />}
        {held && <HoldBadge until={item.holdExpiresAt!} />}
        {!open ? null : !item.payment && (
          <button onClick={() => payStripe(item._id)} className='w-full px-6 py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs uppercase hover:bg-slate-800 active:scale-95 transition-all'>
            Pay Online
          </button>
        )}
        {item.payment && open && (
          <div className='flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 text-teal-600 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-wider border border-teal-100'>
            <RiShieldCheckLine size={14} /> {item.paymentMethod === 'wallet' ? 'Paid from wallet' : 'Paid securely'}
          </div>
        )}
        {open && (
          <button onClick={() => cancelAppointment(item._id)} className='w-full px-6 py-3 border border-slate-200 text-slate-400 rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs uppercase hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all'>
            {held ? 'Release time' : 'Cancel'}
          </button>
        )}
        {item.cancelled && <button className='w-full px-6 py-3 border border-red-100 text-red-400 rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs uppercase cursor-not-allowed'>Cancelled</button>}

        {/* messaging, joining and directions start once it's a real (paid) booking */}
        {!item.cancelled && !held && (
          <MessageDoctorButton doctorId={item.docId} appointmentId={item._id} label='Message' className='w-full' />
        )}
        {open && !held && item.kind !== 'video' && (
          <DirectionsButton docId={item.docId} address={item.docData?.address} className='w-full' />
        )}

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
