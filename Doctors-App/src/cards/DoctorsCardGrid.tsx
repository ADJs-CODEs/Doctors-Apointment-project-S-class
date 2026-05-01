import React, { useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion';
import SkeletonCard from '../components/SkeletonCard.js';
import type { AppContextType, Doctor, DoctorsCardGridProps } from '../types/index.js';
import {
  RiArrowRightLine,
  RiShieldCheckFill,
  RiUserSearchLine,
  RiRefreshLine
} from "@remixicon/react";

import { AppContext } from '../Context/AppContext.js';
import { useNavigate } from 'react-router-dom';


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
              <div className='aspect-4/5 overflow-hidden bg-slate-100 relative'>
                <img
                  src={item.image}
                  className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700'
                  alt={item.name}
                />
                <div className='absolute top-4 left-4 z-20'>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-sm ${item.available
                    ? 'bg-white/90 border-teal-100 text-teal-600'
                    : 'bg-white/90 border-rose-100 text-rose-500'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-teal-500 animate-pulse' : 'bg-rose-400'}`} />
                    <span className='text-[9px] font-black uppercase tracking-wider'>
                      {item.available ? 'Available' : 'Busy'}
                    </span>
                  </div>
                </div>
              </div>

              <div className='p-6'>
                <div className='flex justify-between items-start mb-4'>
                  <div className='flex-1 pr-2'>
                    <p className='text-teal-600 font-bold text-[9px] md:text-[10px] uppercase tracking-[2px] mb-1'>
                      {item.speciality}
                    </p>
                    <h3 className='text-base md:text-lg font-bold text-slate-800 group-hover:text-teal-600 transition-colors leading-snug'>
                      {item.name}
                    </h3>
                  </div>
                  <div className='p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-all shrink-0'>
                    <RiArrowRightLine size={20} />
                  </div>
                </div>

                <div className='flex items-center gap-6 pt-4 border-t border-slate-50'>
                  <div className='flex items-center gap-1.5 text-slate-400'>
                    <RiShieldCheckFill size={16} className="text-teal-500" />
                    <span className='text-[10px] md:text-[11px] font-bold'>Verified</span>
                  </div>
                  <div className='flex items-center gap-2 ml-auto text-slate-900'>
                    <span className='text-[9px] font-bold text-slate-400 uppercase'>Fee</span>
                    <span className='text-sm font-black'>${item.fees}</span>
                  </div>
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
