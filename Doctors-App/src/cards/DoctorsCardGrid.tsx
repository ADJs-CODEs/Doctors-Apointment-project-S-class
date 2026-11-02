"use client";

import React, { useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion';
import SkeletonCard from '../components/SkeletonCard';
import type { AppContextType, Doctor, DoctorsCardGridProps } from '../types/index';
import {
  RiArrowRightLine,
  RiCalendarLine,
  RiHospitalLine,
  RiMapPin2Line,
  RiShieldCheckFill,
  RiUserSearchLine,
  RiRefreshLine,
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
const offersVideo = (d: Doctor) => (d.videoFees ?? 0) > 0 && !!d.availability?.weekly?.some((w) => w.kinds.includes('video'));

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


const DoctorsCardGrid: React.FC<DoctorsCardGridProps> = ({ filteredDoctors, handleClearFilters }) => {
  const navigate = useNavigate()

  const { loading } = useContext(AppContext) as AppContextType;
  return (
    <AnimatePresence mode='popLayout'>
      {loading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8'>
          {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} type="grid" />)}
        </div>
      ) : filteredDoctors.length > 0 ? (
        <motion.div layout className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8'>
          {filteredDoctors.map((item: Doctor) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => { navigate(`/appointments/${item._id}`); window.scrollTo(0, 0); }}
              className='group bg-white border border-slate-100 rounded-[28px] md:rounded-4xl overflow-hidden cursor-pointer hover:shadow-[0_24px_48px_rgba(0,0,0,0.06)] transition-all duration-500 relative'
              key={item._id}
            >
              <div className='aspect-[5/4] overflow-hidden bg-slate-100 relative'>
                <img
                  src={item.image}
                  className='w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700'
                  alt={item.name}
                />
                <div className='absolute top-4 left-4 z-20'>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-sm ${item.available
                    ? 'bg-white/90 border-teal-100 text-teal-700'
                    : 'bg-white/90 border-rose-100 text-rose-600'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-teal-500 animate-pulse' : 'bg-rose-400'}`} />
                    <span className='text-[10px] font-black uppercase tracking-wider'>
                      {item.available ? 'Taking bookings' : 'Not taking bookings'}
                    </span>
                  </div>
                </div>
              </div>

              <div className='p-5 md:p-6'>
                <p className='text-teal-600 font-bold text-[10px] uppercase tracking-[2px] mb-1'>
                  {item.speciality}
                </p>
                <h3 className='text-lg font-black text-slate-900 group-hover:text-teal-600 transition-colors leading-snug flex items-center gap-1.5'>
                  {item.name}
                  <RiShieldCheckFill size={16} className="text-teal-500 shrink-0" aria-label="Verified doctor" />
                </h3>
                <p className='text-[12px] text-slate-500 mt-0.5'>
                  {[item.degree, experienceText(item.experience)].filter(Boolean).join(' · ')}
                </p>

                {/* where, when and how: the things people need before booking */}
                <ul className='mt-4 space-y-2 text-[13px] text-slate-600'>
                  {area(item) && (
                    <li className='flex items-start gap-2'>
                      <RiMapPin2Line size={16} className='text-teal-600 shrink-0 mt-0.5' />
                      <span className='line-clamp-2'>{area(item)}</span>
                    </li>
                  )}
                  <li className='flex items-start gap-2'>
                    <RiCalendarLine size={16} className='text-teal-600 shrink-0 mt-0.5' />
                    <span>Sees patients {daysText(item)}</span>
                  </li>
                </ul>

                <div className='flex flex-wrap gap-2 mt-4'>
                  <span className='inline-flex items-center gap-1.5 text-[12px] font-bold text-teal-800 bg-teal-50 border border-teal-100 px-2.5 py-1.5 rounded-xl'>
                    <RiHospitalLine size={14} /> Clinic visit · {money(item.fees)}
                  </span>
                  {offersVideo(item) && (
                    <span className='inline-flex items-center gap-1.5 text-[12px] font-bold text-violet-800 bg-violet-50 border border-violet-100 px-2.5 py-1.5 rounded-xl'>
                      <RiVideoOnLine size={14} /> Video call · {money(item.videoFees!)}
                    </span>
                  )}
                </div>

                <div className='mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-900 text-white text-sm font-black group-hover:bg-teal-600 transition-colors'>
                  Book appointment <RiArrowRightLine size={18} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='flex flex-col items-center justify-center py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200'
        >
          <div className='w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6'>
            <RiUserSearchLine size={40} />
          </div>
          <h3 className='text-xl font-bold text-slate-800 mb-2'>No practitioners found</h3>
          <p className='text-slate-500 max-w-xs text-sm mb-8'>
            We couldn't find any doctors matching your criteria. Try adjusting your search or department.
          </p>
          <button
            onClick={handleClearFilters}
            className='flex items-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-100 active:scale-95'
          >
            <RiRefreshLine size={16} />
            Reset Registry Filters
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default DoctorsCardGrid
