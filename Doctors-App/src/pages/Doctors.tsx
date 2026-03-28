import React, { useContext, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../Context/AppContext.js';
import SkeletonCard from '../components/SkeletonCard.js';
import type { AppContextType, Doctor } from '../types/index.js';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  RiSearchLine,
  RiFilter3Line,
  RiArrowRightLine,
  RiShieldCheckFill,
  RiUserSearchLine,
  RiRefreshLine
} from "@remixicon/react";

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
    <div className='max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 bg-[#F8FAFC] min-h-screen'>

      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-teal-500 origin-left z-[100]"
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
            className='w-full bg-white border border-slate-200 rounded-2xl md:rounded-[24px] py-4 pl-14 pr-6 focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 transition-all outline-none shadow-sm text-slate-700 text-sm'
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
                    className='group bg-white border border-slate-100 rounded-[28px] md:rounded-[32px] overflow-hidden cursor-pointer hover:shadow-[0_24px_48px_rgba(0,0,0,0.06)] transition-all duration-500 relative'
                    key={item._id}
                  >
                    <div className='aspect-[4/5] overflow-hidden bg-slate-100 relative'>
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
        </main>
      </div>
    </div>
  )
}

export default Doctors;