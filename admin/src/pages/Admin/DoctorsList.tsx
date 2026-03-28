import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext.js'
import { AppContext } from '../../context/AppContext.js'
// ➕ Added RiDeleteBin7Line for the delete icon
import { RiSearchLine, RiFilter3Line, RiUserStarLine, RiLoader4Line, RiDeleteBin7Line } from '@remixicon/react'
import type { AdminContextType, AppContextType, Doctor } from '../../types/index.js'

const DoctorList: React.FC = () => {
  // ➕ Destructure deleteDoctor and setProgress
  const { doctors, aToken, getAllDoctors, changeAvailability, deleteDoctor } = useContext(AdminContext) as AdminContextType
  const { setProgress } = useContext(AppContext) as AppContextType

  const [searchTerm, setSearchTerm] = useState('')
  const [specialityFilter, setSpecialityFilter] = useState('All')
  const [filteredDocs, setFilteredDocs] = useState<Doctor[]>([])

  const specialities = ['All', 'General physician', 'Gynecologist', 'Dermatologist', 'Pediatricians', 'Neurologist', 'Gastroenterologist']

  useEffect(() => {
    if (aToken) {
      setProgress(40)
      getAllDoctors().finally(() => setProgress(100))
    }
  }, [aToken, getAllDoctors])

  useEffect(() => {
    if (Array.isArray(doctors)) {
      let result = [...doctors]
      if (searchTerm) {
        result = result.filter(doc => doc?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      }
      if (specialityFilter !== 'All') {
        result = result.filter(doc => doc?.speciality === specialityFilter)
      }
      setFilteredDocs(result)
    }
  }, [doctors, searchTerm, specialityFilter])

  // --- 🛡️ HANDLER: DELETE DOCTOR ---
  const handleTerminate = async (id: string, name: string) => {
    if (window.confirm(`CRITICAL ACTION: Are you sure you want to terminate ${name}'s account? This will remove all their data and login access permanently.`)) {
      setProgress(30)
      await deleteDoctor(id)
      setProgress(100)
    }
  }

  const handleToggleAvailability = async (id: string) => {
    setProgress(50)
    await changeAvailability(id)
    setProgress(100)
  }

  if (!doctors) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[80vh] bg-slate-50/50 animate-reveal'>
        <RiLoader4Line size={40} className='text-teal-500 animate-spin mb-4' />
        <p className='text-[10px] font-black uppercase tracking-[3px] text-slate-400 text-center'>
          Fetching Medical Registry... <br /> <span className='opacity-50 font-medium'>Please wait</span>
        </p>
      </div>
    )
  }

  return (
    <div className='p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal'>
      <div className='max-w-7xl mx-auto'>

        {/* --- Header & Search --- */}
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10'>
          <div>
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-2.5 sm:p-3 bg-slate-900 rounded-xl sm:rounded-2xl text-teal-400 shadow-lg'>
                <RiUserStarLine size={24} />
              </div>
              <h1 className='text-2xl sm:text-3xl font-black text-slate-900'>Medical <span className='text-teal-500 font-serif italic normal-case'>Registry</span></h1>
            </div>
            <p className='text-slate-500 text-xs sm:text-sm font-medium ml-12 sm:ml-14'>Manage practitioner status and visibility.</p>
          </div>

          <div className='flex items-center gap-3 bg-white p-2 rounded-2xl sm:rounded-3xl shadow-portal border border-slate-100 w-full lg:w-96'>
            <div className='pl-3 text-slate-400'><RiSearchLine size={20} /></div>
            <input
              type="text"
              placeholder="Search by name..."
              className='w-full bg-transparent border-none outline-none py-2 text-sm font-bold text-slate-800'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* --- Filter Pills --- */}
        <div className='flex gap-3 overflow-x-auto hide-scrollbar pb-6 mb-8'>
          {specialities.map((spec) => (
            <button
              key={spec}
              onClick={() => setSpecialityFilter(spec)}
              className={`shrink-0 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${specialityFilter === spec
                ? 'bg-slate-900 text-white shadow-xl scale-105'
                : 'bg-white text-slate-400 border border-slate-100 hover:border-teal-200 hover:text-teal-600'
                }`}
            >
              {spec}
            </button>
          ))}
        </div>

        {/* --- Doctor Grid --- */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8'>
          {filteredDocs.map((item, index) => {
            const isAvailable = item?.available ?? false;

            return (
              <div
                key={item?._id || index}
                className='group bg-white rounded-[32px] sm:rounded-[40px] overflow-hidden border border-slate-100 shadow-portal hover:shadow-2xl transition-all duration-500 relative'
              >
                {/* 🗑️ ABSOLUTE DELETE BUTTON */}
                <button
                  onClick={() => handleTerminate(item._id, item.name)}
                  className='absolute top-4 left-4 z-20 p-3 bg-white/90 backdrop-blur-md rounded-2xl text-red-500 lg:opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500 hover:text-white shadow-xl active:scale-90'
                  title="Terminate Doctor"
                >
                  <RiDeleteBin7Line size={18} />
                </button>

                <div className='relative aspect-square overflow-hidden bg-slate-100'>
                  <img
                    className='w-full h-full object-cover transition-transform duration-700 lg:group-hover:scale-110 bg-white'
                    style={{
                      imageRendering: 'auto',
                      backfaceVisibility: 'hidden',
                      transform: 'translateZ(0)'
                    }}
                    src={item?.image.replace('/upload/', '/upload/f_jpg,q_auto:best,w_500,h_500,c_fill/')}
                    alt={item?.name}
                  />
                  <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 border ${isAvailable ? 'bg-teal-500/20 border-teal-400/30 text-teal-700' : 'bg-red-500/20 border-red-400/30 text-red-700'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className='text-[9px] font-black uppercase tracking-widest'>{isAvailable ? 'Active' : 'Offline'}</span>
                  </div>
                </div>

                <div className='p-6'>
                  <p className='text-teal-600 text-[9px] font-black uppercase tracking-[2px] mb-1'>{item?.speciality}</p>
                  <h3 className='text-lg font-black text-slate-900 mb-4'>{item?.name}</h3>

                  <div className='flex items-center justify-between pt-4 border-t border-slate-50'>
                    <span className='text-[10px] font-black uppercase text-slate-400 tracking-widest'>Availability</span>
                    <div
                      onClick={() => item?._id && handleToggleAvailability(item._id)}
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 active:scale-95 ${isAvailable ? 'bg-teal-500' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* --- Empty State --- */}
        {filteredDocs.length === 0 && (
          <div className='flex flex-col items-center justify-center py-20 sm:py-32 text-center bg-white rounded-[32px] sm:rounded-[40px] border border-dashed border-slate-200 mx-4'>
            <RiFilter3Line size={48} className='text-slate-200 mb-4' />
            <h2 className='text-xl font-black text-slate-900'>No practitioners found</h2>
            <p className='text-slate-400 text-sm font-medium'>Try refining your search or speciality filter.</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default DoctorList