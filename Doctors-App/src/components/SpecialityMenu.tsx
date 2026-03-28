import React from 'react'
import { specialityData } from '../assets/assets/assets_frontend/assets.js'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RiArrowRightLine } from '@remixicon/react'

const SpecialityMenu: React.FC = () => {
  return (
    <div className='max-w-7xl mx-auto py-12 md:py-24 px-4 sm:px-10' id='speciality'>
      {/* --- Header Section --- */}
      {/* Changed to flex-col for mobile, md:flex-row for desktop */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 md:mb-16'>
        <div className='space-y-3 md:space-y-4'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-teal-600'>
            <span className='text-[9px] md:text-[10px] font-black uppercase tracking-[1.5px] md:tracking-[2px]'>Departments</span>
          </div>
          <h2 className='text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none'>
            Clinical <span className='text-teal-500 font-serif normal-case italic text-3xl sm:text-4xl md:text-6xl'>Specialities</span>
          </h2>
          <p className='text-slate-500 text-xs sm:text-sm max-w-md font-medium leading-relaxed'>
            Select a specialized department to browse our board-certified medical experts and consultants.
          </p>
        </div>

        {/* This divider hides on mobile to save vertical space */}
        <div className='hidden lg:block h-[2px] flex-1 bg-slate-100 mb-6 mx-12 rounded-full' />

        <Link
          to="/doctors"
          className='flex items-center gap-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-500 transition-colors mb-2 md:mb-4'
        >
          View All <RiArrowRightLine size={16} />
        </Link>
      </div>

      {/* --- Speciality Grid --- */}
      {/* 2 columns on mobile, 3 on tablets, 6 on desktop */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6'>
        {specialityData.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              to={`/doctors/${item.speciality}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className='group flex flex-col items-center p-6 md:p-8 bg-white border border-slate-100 rounded-[30px] md:rounded-[40px] hover:bg-slate-900 hover:border-slate-900 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-teal-500/10'
            >
              <div className='w-14 h-14 md:w-20 md:h-20 mb-4 md:mb-6 relative flex items-center justify-center'>
                {/* Hover Glow Effect */}
                <div className='absolute inset-0 bg-teal-400/20 rounded-full scale-0 group-hover:scale-125 transition-transform duration-500' />
                <img
                  className='w-full h-full object-contain relative z-10 group-hover:scale-110 group-hover:brightness-0 group-hover:invert transition-all duration-500'
                  src={item.image}
                  alt={item.speciality}
                />
              </div>
              <p className='text-[9px] md:text-[10px] font-black uppercase tracking-[1.5px] md:tracking-[2px] text-slate-400 group-hover:text-teal-400 transition-colors text-center'>
                {item.speciality}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default SpecialityMenu