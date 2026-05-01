import React, { useContext, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../Context/AppContext.js';

import type { AppContextType } from '../types/index.js';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
  RiSearchLine,
  RiFilter3Line,
} from "@remixicon/react";
import DoctorsCardGrid from '../cards/DoctorsCardGrid.js';

const Doctors: React.FC = () => {
  const { speciality } = useParams<{ speciality?: string }>()
  const { doctors, loading } = useContext(AppContext) as AppContextType;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const navigate = useNavigate();

  // Progress Bar Logic
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const specialties = [
    'General physician', 'Gynecologist', 'Dermatologist',
    'Pediatricians', 'Neurologist', 'Gastroenterologist'
  ];

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      const matchesSpec = speciality ? doc.speciality === speciality : true;
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSpec && matchesSearch;
    });
  }, [doctors, speciality, searchTerm]);

  // Clear Filter Logic
  const handleClearFilters = () => {
    setSearchTerm('');
    navigate('/doctors');
  };

  return (
    <div className='max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 bg-clinic-bg min-h-screen'>

      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-teal-500 origin-left z-100"
        style={{ scaleX }}
      />

      {/* --- Rebranded Header Section --- */}
      <div className='flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12 md:mb-16'>
        <div className='max-w-xl'>
          <h1 className='text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4 uppercase'>
            Expert <span className='text-teal-600 font-serif normal-case italic'>Consultants</span>
          </h1>
          <p className='text-slate-500 text-sm md:text-base font-medium leading-relaxed'>
            Access our network of certified medical professionals. Use the filters to find a specialist in your preferred department.
          </p>
        </div>

        {/* Search Bar - Clinical Style */}
        <div className='relative w-full lg:w-96 group'>
          <RiSearchLine
            size={20}
            className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors'
          />
          <input
            type="text"
            placeholder="Search specialists by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full bg-white border border-slate-200 rounded-2xl md:rounded-3xl py-4 pl-14 pr-6 focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 transition-all outline-none shadow-sm text-slate-700 text-sm'
          />
        </div>
      </div>

      <div className='flex flex-col lg:flex-row gap-8 lg:gap-12'>

        {/* --- Sidebar Navigation --- */}
        <aside className='w-full lg:w-64 shrink-0'>
          <div className='lg:sticky lg:top-32'>
            <div className='flex items-center gap-2 mb-4 md:mb-6 px-2'>
              <RiFilter3Line size={18} className="text-teal-600" />
              <p className='text-[10px] font-black text-slate-400 uppercase tracking-[3px]'>Department</p>
            </div>

            <div className='flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 no-scrollbar'>
              <button
                onClick={() => navigate('/doctors')}
                className={`whitespace-nowrap text-left px-5 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl transition-all border text-[10px] md:text-[11px] font-bold uppercase tracking-widest ${!speciality
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-teal-500 hover:text-teal-600'
                  }`}
              >
                All Specialists
              </button>

              {specialties.map((cat) => (
                <button
                  key={cat}
                  onClick={() => speciality === cat ? navigate('/doctors') : navigate(`/doctors/${cat}`)}
                  className={`whitespace-nowrap text-left px-5 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl transition-all border text-[10px] md:text-[11px] font-bold uppercase tracking-widest ${speciality === cat
                    ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-100'
                    : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-teal-600'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* --- Doctors Grid --- */}
        <main className='flex-1'>
          <DoctorsCardGrid
            filteredDoctors={filteredDoctors}
            handleClearFilters={handleClearFilters}
          />
        </main>
      </div>
    </div>
  )
}

export default Doctors;