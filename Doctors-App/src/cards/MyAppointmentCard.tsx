"use client";

import React, { useContext, useEffect, useState } from 'react'
import type { AppContextType, Appointment, MyAppointmentCardProps } from '../types/index';
import { AppContext } from '../Context/AppContext';
import { RiErrorWarningLine, RiShieldCheckLine, RiArrowDownSLine, RiCalendarCloseLine, RiCalendarLine, RiHospitalLine, RiVideoOnLine, RiTimerLine, RiBankCardLine } from "@remixicon/react"
import { slotDateFormat, slotToDate } from '../utils/medicationUtils';
import { useNavigate } from '@/lib/navigation';
import MessageDoctorButton from '../components/patient/MessageDoctorButton';
import { DirectionsButton } from '../components/patient/ClinicMap';
import VideoCallPanel from '../components/patient/VideoCallPanel';
import { useCallWindow } from '../components/patient/JoinCallButton';

// a status note in the action column (hold, missed, not paid in time)
const NOTE = 'px-3.5 py-3 rounded-[14px] border text-left w-full md:max-w-[240px]'

/** A time that's held but not paid for yet, with a live countdown. */
function HoldBadge({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])
  const mins = Math.max(0, Math.ceil((new Date(until).getTime() - now) / 60_000))
  return (
    <div className={`${NOTE} border-amber-200 bg-amber-50`}>
      <p className='flex items-center gap-1.5 font-bold text-[13px] text-amber-800'>
        <RiTimerLine size={15} /> Awaiting payment
      </p>
      <p className='text-[13px] text-amber-800 mt-0.5 leading-snug'>
        {mins > 0 ? <>Held for <span className='num'>{mins}</span> more min. Pay to confirm.</> : 'Hold expired. Book again.'}
      </p>
    </div>
  )
}

/** Missed appointment: whose miss it was and what happened to the money. */
function MissedBadge({ item }: { item: Appointment }) {
  const byPatient = item.missed?.by === 'patient'
  const refund = item.refund
  const { currencySymbol } = useContext(AppContext) as AppContextType
  // why it counts as missed, and so why the refund is 50% or 100%
  const why = byPatient
    ? 'Marked as a no-show, so half the fee comes back'
    : item.missed?.markedBy === 'system'
      ? "Your doctor didn't close this visit within 24 hours, so it counts as their miss and you get it all back"
      : 'Your doctor missed this visit, so you get it all back'
  return (
    <div className={`${NOTE} ${byPatient ? 'bg-orange-50 border-orange-100' : 'bg-rose-50 border-rose-100'}`}>
      <p className={`flex items-center gap-1.5 font-bold text-[13px] ${byPatient ? 'text-orange-700' : 'text-rose-700'}`}>
        <RiCalendarCloseLine size={15} /> {byPatient ? 'You missed this visit' : 'Doctor missed'}
      </p>
      {refund && (
        <p className='text-[13px] text-ink-2 mt-1 leading-snug'>
          <span className='font-bold text-ink'>{refund.percent}% refund (<span className='num'>{currencySymbol}{refund.amount}</span>)</span>
          <br />
          <span className={refund.status === 'refunded' ? 'text-brand-ink font-semibold' : 'text-ink-3'}>
            {refund.status !== 'refunded'
              ? 'The clinic is sending it to you'
              : refund.method === 'wallet'
                ? 'Back in your wallet'
                : 'Sent to your card'}
          </span>
        </p>
      )}
      <p className='text-[12px] text-ink-3 mt-1.5 leading-snug'>{why}</p>
    </div>
  )
}

const MyAppointmentCard: React.FC<MyAppointmentCardProps> = ({ item, isCritical, cancelAppointment, payStripe, isExpanded, toggleTracker }) => {
  // still to happen: not done, cancelled or missed
  const open = !item.cancelled && !item.isCompleted && !item.missed
  // picked but not paid yet: only held for a while
  const held = !!item.holdExpiresAt && !item.payment
  const isVideo = item.kind === 'video'
  // unpaid and its time has passed (bookings from before pay-first): nothing left to pay for
  const { state: callState } = useCallWindow(item.slotDate, item.slotTime)
  const start = slotToDate(item.slotDate, item.slotTime)
  const lapsed = open && !held && !item.payment && (isVideo ? callState === 'ended' : !!start && start.getTime() < Date.now())
  // a paid visit can't be cancelled once it has started (the server refuses it too)
  const canCancel = open && !(item.payment && !!start && start.getTime() <= Date.now())
  const navigate = useNavigate()

  return (
    <div className={`surface p-4 md:p-5 rounded-[22px] flex flex-col md:flex-row gap-4 md:gap-6 md:items-center transition-colors ${isCritical ? '!border-rose-300 !bg-rose-50/50' : ''} ${!open ? 'opacity-[.92]' : ''}`}>
      <div className='flex gap-4 items-center flex-1 min-w-0'>
        <div className='relative shrink-0'>
          <img
            className='w-[72px] h-[72px] md:w-20 md:h-20 rounded-[18px] object-cover bg-brand-soft border border-line'
            src={item.docData?.image?.replace('/upload/', '/upload/f_jpg,q_auto:best,w_400,h_400,c_fill/')}
            alt=""
          />
          {isCritical && (
            <span className='absolute -top-1.5 -right-1.5 bg-rose-600 text-white p-1 rounded-full ring-2 ring-white'>
              <RiErrorWarningLine size={14} />
            </span>
          )}
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <p className='text-[18px] font-bold tracking-[-0.01em] text-ink truncate'>{item.docData?.name}</p>
            {isCritical && (
              <span className='text-[12px] font-bold text-white bg-rose-600 px-2 py-0.5 rounded-full'>Needs your attention</span>
            )}
          </div>
          <p className='text-[14px] font-semibold text-brand-ink'>{item.docData?.speciality}</p>
          <div className='flex flex-wrap items-center gap-2 mt-2.5'>
            {/* what kind of visit, always spelled out */}
            {isVideo ? (
              <span className='inline-flex items-center gap-1.5 text-[13px] font-bold text-video bg-video-soft border border-violet-100 px-2.5 py-1 rounded-full'>
                <RiVideoOnLine size={15} /> Video call
              </span>
            ) : (
              <span className='inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-ink bg-brand-soft border border-[#C4E8E5] px-2.5 py-1 rounded-full'>
                <RiHospitalLine size={15} /> Clinic visit
              </span>
            )}
            <span className='inline-flex items-center gap-1.5 text-[13px] text-ink-2 font-semibold bg-canvas border border-line px-2.5 py-1 rounded-full'>
              <RiCalendarLine size={14} className='text-ink-3' />
              {slotDateFormat(item.slotDate)} · <span className='num'>{item.slotTime}</span>
            </span>
          </div>
          {/* video calls always say where they stand: pay, starts in…, live (join), ended */}
          {item.kind === 'video' && !held && <VideoCallPanel item={item} onPay={() => payStripe(item._id)} />}
        </div>
      </div>

      {/* what you can do */}
      <div className='flex flex-col gap-2 w-full md:w-[220px] shrink-0'>
        {item.missed && <MissedBadge item={item} />}
        {/* video calls say this in their panel; clinic visits say it here */}
        {lapsed && !isVideo && (
          <div className={`${NOTE} border-line bg-canvas`}>
            <p className='flex items-center gap-1.5 font-bold text-[13px] text-ink-2'>
              <RiCalendarCloseLine size={15} /> Not paid in time
            </p>
            <p className='text-[13px] text-ink-3 mt-0.5 leading-snug'>This visit didn&apos;t go ahead. Nothing was charged.</p>
            <button
              type='button'
              onClick={() => navigate(`/appointments/${item.docId}`)}
              className='btn btn-ink w-full mt-2 !py-2 !text-[13px] !rounded-xl'
            >
              Book a new time
            </button>
          </div>
        )}
        {held && <HoldBadge until={item.holdExpiresAt!} />}
        {!open || lapsed ? null : !item.payment && (
          <button type='button' onClick={() => payStripe(item._id)} className='btn btn-ink w-full !py-2.5 !text-[14px] !rounded-xl'>
            <RiBankCardLine size={16} /> Pay now
          </button>
        )}
        {item.payment && open && (
          <div className='flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-soft text-brand-ink rounded-xl font-bold text-[14px] border border-[#C4E8E5]'>
            <RiShieldCheckLine size={16} /> {item.paymentMethod === 'wallet' ? 'Paid from wallet' : 'Paid'}
          </div>
        )}
        {item.cancelled && (
          <div className='flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-[14px] text-rose-600 bg-rose-50 border border-rose-100'>
            Cancelled
          </div>
        )}

        <div className='grid grid-cols-2 md:grid-cols-1 gap-2'>
          {/* messaging, joining and directions start once it's a real (paid) booking */}
          {!item.cancelled && !held && (
            <MessageDoctorButton doctorId={item.docId} appointmentId={item._id} label='Message' className='w-full' />
          )}
          {open && !held && !lapsed && item.kind !== 'video' && (
            <DirectionsButton docId={item.docId} address={item.docData?.address} className='w-full' />
          )}
          {item.isCompleted && (
            <button
              type='button'
              onClick={() => toggleTracker(item._id)}
              aria-expanded={isExpanded}
              className={`flex items-center justify-center gap-1.5 w-full px-4 py-2.5 border rounded-xl font-bold text-[14px] transition-colors ${isExpanded ? 'btn-teal' : 'bg-white border-[#C4E8E5] text-brand-ink hover:bg-brand-soft'}`}
            >
              {isExpanded ? 'Hide report' : 'View report'}
              <RiArrowDownSLine className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} size={16} />
            </button>
          )}
          {canCancel && (
            <button
              type='button'
              onClick={() => cancelAppointment(item._id)}
              className='w-full px-4 py-2.5 border border-line bg-white text-ink-3 rounded-xl font-bold text-[14px] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-colors'
            >
              {held ? 'Release time' : lapsed ? 'Remove' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyAppointmentCard
