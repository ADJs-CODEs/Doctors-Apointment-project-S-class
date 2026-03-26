import React, { useContext } from 'react';
import { AppContext } from '../Context/AppContext.js';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RiVerifiedBadgeFill, RiArrowRightLine } from '@remixicon/react';
import type { AppContextType, Doctor } from '../types/index.js';

const TopDoctors: React.FC = () => {
  const navigate = useNavigate();
  const context = useContext(AppContext) as AppContextType;
  const { doctors } = context;

  const handleNavigate = (path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className='flex flex-col items-center gap-6 my-24 md:mx-10'>

      {/* --- Header Section --- */}
      <div className='text-center space-y-3 mb-8'>
        <div className='inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-teal-600'>
          <RiVerifiedBadgeFill size={14} />
          <span className='text-[10px] font-black uppercase tracking-widest'>Elite Practitioners</span>
        </div>
        <h1 className='text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight'>
          Top <span className='text-teal-500 font-serif normal-case italic'>Specialists</span>
        </h1>
        <p className='sm:w-2/3 mx-auto text-slate-500 text-sm font-medium'>
          Access our most requested medical experts across the Lagos network.
        </p>
      </div>

      {/* --- Doctors Grid --- */}
      <div className='w-full grid grid-cols-auto gap-6 pt-5 px-3 sm:px-0'>
        {doctors.slice(0, 10).map((item: Doctor, index: number) => (
          <motion.div
            key={index}
            whileHover={{ y: -10 }}
            onClick={() => handleNavigate(`/appointments/${item._id}`)}
            className='medical-card group cursor-pointer border border-slate-100 hover:border-teal-500/30 transition-all duration-500'
          >
            {/* Image Container with Medical Ambient Background */}
            <div className='relative aspect-[4/5] bg-slate-50 overflow-hidden'>
              <img
                className='w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700'
                src={item.image}
                alt={item.name}
              />
              <div className='absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent' />
            </div>

            <div className='p-6 space-y-3'>
              {/* Availability Badge */}
              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${item.available ? 'text-teal-600' : 'text-slate-400'}`}>
                <div className={`w-2 h-2 rounded-full ${item.available ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`} />
                {item.available ? 'Ready for Consultation' : 'Fully Booked'}
              </div>

              <div>
                <p className='text-slate-900 text-lg font-black leading-tight mb-1'>{item.name}</p>
                <p className='text-teal-600 text-[11px] font-bold uppercase tracking-wider'>{item.speciality}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* --- Footer Button --- */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleNavigate('/doctors')}
        className='mt-16 flex items-center gap-3 bg-white border border-slate-100 px-10 py-4 rounded-2xl text-slate-900 font-black uppercase tracking-widest text-xs shadow-clinical hover:bg-slate-900 hover:text-white transition-all group'
      >
        View All Consultants
        <RiArrowRightLine size={18} className='text-teal-500 group-hover:text-white transition-colors' />
      </motion.button>
    </div>
  );
};

export default TopDoctors;