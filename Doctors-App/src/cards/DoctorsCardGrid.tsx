"use client";

import React, { useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion';
import type { AppContextType, Doctor, DoctorsCardGridProps } from '../types/index';
import {
  RiArrowRightLine,
  RiCalendarLine,
  RiHospitalLine,
  RiMapPin2Line,
  RiShieldCheckFill,
  RiVideoOnLine,
} from "@remixicon/react";

import { AppContext } from '../Context/AppContext';
import { useNavigate } from "@/lib/navigation";

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const money = (n: number) => `$${Number(n).toLocaleString('en-US')}`;

/** "5 Years" / "5" -> "5 years' experience"; "1 Year" -> "1 year's experience" */
const experienceText = (exp?: string) => {
  const n = parseInt(exp ?? '', 10);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n === 1 ? "1 year's experience" : `${n} years' experience`;
};

/** Where they practise: the area and city line, else the street line. */
const area = (d: Doctor) => d.address?.line2?.trim() || d.address?.line1?.trim() || '';

/** Video needs a video fee and some video hours (same rule as the booking page). */
export const offersVideo = (d: Doctor) => (d.videoFees ?? 0) > 0 && !!d.availability?.weekly?.some((w) => w.kinds.includes('video'));

/** Clinic visits: no hours set means the old every-day clinic hours. */
export const offersClinic = (d: Doctor) => !d.availability?.weekly?.length || d.availability.weekly.some((w) => w.kinds.includes('in-person'));

/** Their working days, e.g. "Mon–Fri", "Mon, Wed, Fri", "every day". No hours set = the old every day. */
const daysText = (d: Doctor) => {
  const weekly = d.availability?.weekly;
  if (!weekly?.length) return 'every day';
  const days = [...new Set(weekly.map((w) => w.day))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // Monday first
  if (days.length === 7) return 'every day';
  const order = days.map((x) => (x + 6) % 7);
  const consecutive = order.every((x, i) => i === 0 || x === order[i - 1] + 1);
  return consecutive && days.length > 2 ? `${DAY[days[0]]}–${DAY[days[days.length - 1]]}` : days.map((x) => DAY[x]).join(', ');
};

const GRID = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6';

const DoctorsCardGrid: React.FC<DoctorsCardGridProps> = ({ filteredDoctors, handleClearFilters }) => {
  const navigate = useNavigate()

  const { loading } = useContext(AppContext) as AppContextType;
  return (
    <AnimatePresence mode='popLayout'>
      {loading ? (
        <div className={GRID} aria-busy="true" aria-label="Loading doctors">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className='surface rounded-[24px] overflow-hidden animate-pulse'>
              <div className='aspect-[5/4] bg-line/60' />
              <div className='p-5 space-y-3'>
                <div className='h-3 w-24 rounded bg-line' />
                <div className='h-5 w-48 rounded bg-line' />
                <div className='h-3 w-36 rounded bg-line' />
                <div className='h-11 rounded-2xl bg-line mt-5' />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDoctors.length > 0 ? (
        <motion.div layout className={GRID}>
          {filteredDoctors.map((item: Doctor) => (
            <motion.button
              type='button'
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={() => { navigate(`/appointments/${item._id}`); window.scrollTo(0, 0); }}
              className='group surface text-left rounded-[24px] overflow-hidden cursor-pointer transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(11,37,69,0.10)] focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-3'
              key={item._id}
            >
              <div className='aspect-[5/4] overflow-hidden bg-brand-soft relative'>
                <img
                  src={item.image}
                  className='w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-700'
                  alt=''
                />
                <span className={`glass absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold ${item.available ? 'text-brand-ink' : 'text-rose-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-brand animate-pulse' : 'bg-rose-400'}`} />
                  {item.available ? 'Taking bookings' : 'Not taking bookings'}
                </span>
              </div>

              <div className='p-5'>
                <p className='eyebrow !text-[12px] mb-1'>{item.speciality}</p>
                <h3 className='text-[19px] font-extrabold tracking-[-0.01em] text-ink leading-snug flex items-center gap-1.5'>
                  {item.name}
                  <RiShieldCheckFill size={16} className="text-brand shrink-0" aria-label="Verified doctor" />
                </h3>
                <p className='text-[13px] text-ink-3 mt-0.5'>
                  {[item.degree, experienceText(item.experience)].filter(Boolean).join(' · ')}
                </p>

                {/* where, when and how: the things people need before booking */}
                <ul className='mt-4 space-y-2 text-[14px] text-ink-2'>
                  {area(item) && (
                    <li className='flex items-start gap-2'>
                      <RiMapPin2Line size={16} className='text-brand-ink shrink-0 mt-0.5' />
                      <span className='line-clamp-2'>{area(item)}</span>
                    </li>
                  )}
                  <li className='flex items-start gap-2'>
                    <RiCalendarLine size={16} className='text-brand-ink shrink-0 mt-0.5' />
                    <span>Sees patients {daysText(item)}</span>
                  </li>
                </ul>

                <div className='grid grid-cols-2 gap-2 mt-4'>
                  {offersClinic(item) && (
                    <span className='flex flex-col gap-0.5 rounded-2xl border border-line bg-white px-3 py-2.5'>
                      <span className='inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-ink'>
                        <RiHospitalLine size={15} /> Clinic
                      </span>
                      <span className='num text-[15px] text-ink'>{money(item.fees)}</span>
                    </span>
                  )}
                  {offersVideo(item) && (
                    <span className='flex flex-col gap-0.5 rounded-2xl border border-line bg-white px-3 py-2.5'>
                      <span className='inline-flex items-center gap-1.5 text-[13px] font-bold text-video'>
                        <RiVideoOnLine size={15} /> Video call
                      </span>
                      <span className='num text-[15px] text-ink'>{money(item.videoFees!)}</span>
                    </span>
                  )}
                </div>

                <span className='btn btn-ink w-full mt-5 group-hover:-translate-y-0.5'>
                  Book a visit <RiArrowRightLine size={18} />
                </span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='glass flex flex-col items-center justify-center py-16 px-6 text-center rounded-[28px]'
        >
          <img src='/emoji/hug.webp' alt='' className='w-16 h-16 mb-4 animate-bob' />
          <h3 className='text-[20px] font-extrabold text-ink mb-1.5'>No doctors match that</h3>
          <p className='text-ink-3 max-w-xs text-[15px] mb-6'>
            Try another speciality or visit type, or clear the search.
          </p>
          <button type='button' onClick={handleClearFilters} className='btn btn-ink'>
            Show all doctors
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default DoctorsCardGrid
