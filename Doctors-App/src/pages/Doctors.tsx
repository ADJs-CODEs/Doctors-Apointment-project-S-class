import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../Context/AppContext.js';
import SkeletonCard from '../components/SkeletonCard.js';
import type { AppContextType, Doctor } from '../types/index.js';

const Doctors: React.FC = () => {

  const { speciality } = useParams<{ speciality?: string }>()
  const context = useContext(AppContext) as AppContextType;
  const { doctors, loading } = context;

  const [filterDoc, setFilterDoc] = useState<Doctor[]>([]);
  const [showFilter, setShowFilter] = useState<boolean>(false)
  const navigate = useNavigate();

  const applyFilter = () => {
    if (speciality) {
      setFilterDoc(doctors.filter(doc => doc.speciality === speciality))
    }
    else {
      setFilterDoc(doctors)
    }
  }

  useEffect(() => {
    applyFilter()
  }, [doctors, speciality])

  return (
    <div>
      <p className='text-gray-600'>Browse through the doctors specialist.</p>
      <div className='flex flex-col sm:flex-row items-start gap-5 mt-5'>
        <button
          className={`py-1 px-3 border rounded text-sm transition-all sm:hidden ${showFilter ? 'bg-primary text-white' : ''}`}
          onClick={() => setShowFilter(prev => !prev)}
        >
          Filters
        </button>

        <div className={`flex-col gap-4 text-sm text-gray-600 ${showFilter ? 'flex' : 'hidden sm:flex'}`}>
          <p onClick={() => speciality === 'General physician' ? navigate('/doctors') : navigate('/doctors/General physician')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'General physician' ? 'bg-indigo-100 text-black ' : ''}`}>General physician</p>
          <p onClick={() => speciality === 'Gynecologist' ? navigate('/doctors') : navigate('/doctors/Gynecologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Gynecologist' ? 'bg-indigo-100 text-black ' : ''}`}>Gynecologist</p>
          <p onClick={() => speciality === 'Dermatologist' ? navigate('/doctors') : navigate('/doctors/Dermatologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Dermatologist' ? 'bg-indigo-100 text-black ' : ''}`}>Dermatologist</p>
          <p onClick={() => speciality === 'Pediatricians' ? navigate('/doctors') : navigate('/doctors/Pediatricians')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Pediatricians' ? 'bg-indigo-100 text-black ' : ''}`}>Pediatricians</p>
          <p onClick={() => speciality === 'Neurologist' ? navigate('/doctors') : navigate('/doctors/Neurologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Neurologist' ? 'bg-indigo-100 text-black ' : ''}`}>Neurologist</p>
          <p onClick={() => speciality === 'Gastroenterologist' ? navigate('/doctors') : navigate('/doctors/Gastroenterologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Gastroenterologist' ? 'bg-indigo-100 text-black ' : ''}`}>Gastroenterologist</p>
        </div>

        <div className='w-full grid grid-cols-auto gap-4 gap-y-6'>
          {loading || doctors.length === 0
            ? Array(8).fill(0).map((_, index) => <SkeletonCard key={index} type="grid" />)
            : filterDoc.length > 0 ? (filterDoc.map((item: Doctor, index: number) => (
              <div
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => navigate(`/appointments/${item._id}`)}
                className='animate-reveal border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500 '
                key={index}
              >
                <img className='bg-blue-50' src={item.image} alt={item.name} />
                <div className='p-4'>
                  <div className={`flex items-center gap-2 text-sm text-center ${item.available ? 'text-green-500' : 'text-gray-500'}`}>
                    <p className={`w-2 h-2 ${item.available ? 'bg-green-500' : 'bg-gray-500'} rounded-full`}></p>
                    <p>{item.available ? 'Available' : 'Not Available'}</p>
                  </div>
                  <p className='text-gray-900 text-lg font-medium'>{item.name}</p>
                  <p className='text-gray-600 text-sm'>{item.speciality}</p>
                </div>
              </div>
            )))
              : (
                <div className='col-span-full py-20 flex flex-col items-center justify-center text-gray-400'>
                  <p className='text-lg'>No doctors found in this category.</p>
                  <button onClick={() => navigate('/doctors')} className='text-primary underline mt-2'>Clear filters</button>
                </div>
              )
          }
        </div>
      </div>
    </div>
  )
}

export default Doctors