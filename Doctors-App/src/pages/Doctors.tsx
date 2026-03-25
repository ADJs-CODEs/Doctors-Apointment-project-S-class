import React, { useContext, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../Context/AppContext.js';
import SkeletonCard from '../components/SkeletonCard.js';
import type { AppContextType } from '../types/index.js';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Funnel, ArrowRight, ShieldCheck, TreeStructure } from "@phosphor-icons/react";

const Doctors: React.FC = () => {
  // --- YOUR EXACT FILTER LOGIC (UNTOUCHED) ---
  const { speciality } = useParams<{ speciality?: string }>()
  const { doctors, loading } = useContext(AppContext) as AppContextType;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const navigate = useNavigate();

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

  return (
    <div className='max-w-7xl mx-auto px-6 py-12 bg-[#F8FAFC] min-h-screen'>

      {/* --- Rebranded Header Section --- */}
      <div className='flex flex-col md:flex-row justify-between items-end gap-10 mb-16'>
        <div className='max-w-xl'>
          <h1 className='text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4'>
            Expert <span className='text-teal-600 font-serif italic'>Consultants</span>
          </h1>
          <p className='text-slate-500 font-medium leading-relaxed'>
            Access our network of certified medical professionals. Use the filters to find a specialist in your preferred department.
          </p>
        </div>

        {/* Search Bar - Clinical Style */}
        <div className='relative w-full md:w-96 group'>
          <MagnifyingGlass
            size={20}
            className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors'
          />
          <input
            type="text"
            placeholder="Search specialists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full bg-white border border-slate-200 rounded-[24px] py-4 pl-14 pr-6 focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 transition-all outline-none shadow-sm text-slate-700'
          />
        </div>
      </div>

      <div className='flex flex-col lg:flex-row gap-12'>

        {/* --- Sidebar Navigation --- */}
        <aside className='w-full lg:w-64 shrink-0'>
          <div className='sticky top-32'>
            <div className='flex items-center gap-2 mb-6 px-2'>
              <Funnel size={18} weight="bold" className="text-teal-600" />
              <p className='text-[10px] font-black text-slate-400 uppercase tracking-[3px]'>Department</p>
            </div>

            <div className='flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 no-scrollbar'>
              {/* Clear Filter Button */}
              <button
                onClick={() => navigate('/doctors')}
                className={`whitespace-nowrap text-left px-6 py-4 rounded-2xl transition-all border text-[11px] font-bold uppercase tracking-widest ${!speciality
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
                  className={`whitespace-nowrap text-left px-6 py-4 rounded-2xl transition-all border text-[11px] font-bold uppercase tracking-widest ${speciality === cat
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
              <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8'>
                {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} type="grid" />)}
              </div>
            ) : (
              <motion.div layout className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8'>
                {filteredDoctors.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate(`/appointments/${item._id}`)}
                    className='group bg-white border border-slate-100 rounded-[32px] overflow-hidden cursor-pointer hover:shadow-[0_24px_48px_rgba(0,0,0,0.06)] transition-all duration-500 relative'
                    key={item._id}
                  >
                    {/* Portrait Area */}
                    <div className='aspect-[4/5] overflow-hidden bg-slate-100 relative'>
                      <img
                        src={item.image}
                        className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700'
                        alt={item.name}
                      />

                      {/* Availability Badge - Clean & Professional */}
                      <div className='absolute top-4 left-4 z-20'>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-sm transition-all ${item.available
                          ? 'bg-white/90 border-teal-100 text-teal-600'
                          : 'bg-white/90 border-rose-100 text-rose-500'
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-teal-500' : 'bg-rose-400'}`} />
                          <span className='text-[9px] font-black uppercase tracking-wider'>
                            {item.available ? 'Available' : 'Busy'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className='p-6'>
                      <div className='flex justify-between items-start mb-4'>
                        <div>
                          <p className='text-teal-600 font-bold text-[10px] uppercase tracking-[2px] mb-1'>
                            {item.speciality}
                          </p>
                          <h3 className='text-lg font-bold text-slate-800 group-hover:text-teal-600 transition-colors'>
                            {item.name}
                          </h3>
                        </div>
                        <div className='p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-all'>
                          <ArrowRight size={20} weight="bold" />
                        </div>
                      </div>

                      <div className='flex items-center gap-6 pt-5 border-t border-slate-50'>
                        <div className='flex items-center gap-1.5 text-slate-400'>
                          <ShieldCheck size={16} weight="fill" className="text-teal-500" />
                          <span className='text-[11px] font-bold'>Verified</span>
                        </div>
                        <div className='flex items-center gap-2 ml-auto text-slate-900'>
                          <span className='text-[10px] font-bold text-slate-400 uppercase'>Fee</span>
                          <span className='text-sm font-black'>${item.fees}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default Doctors