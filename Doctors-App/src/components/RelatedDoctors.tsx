import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../Context/AppContext.js';
import { useNavigate } from 'react-router-dom';
import type { AppContextType, Doctor } from '../types/index.js';

// Define the shape of the props this component receives
interface RelatedDoctorsProps {
  speciality: string;
  docId: string;
}

const RelatedDoctors: React.FC<RelatedDoctorsProps> = ({ speciality, docId }) => {
  const navigate = useNavigate();

  // Cast context to AppContextType to access 'doctors'
  const context = useContext(AppContext) as AppContextType;
  const { doctors } = context;

  const [relDoc, setRelDocs] = useState<Doctor[]>([]);

  useEffect(() => {
    if (doctors.length > 0 && speciality) {
      const doctorsData = doctors.filter(
        (doc) => doc.speciality === speciality && doc._id !== docId
      );
      setRelDocs(doctorsData);
    }
  }, [doctors, speciality, docId]);

  return (
    <div className='flex flex-col items-center gap-4 my-16 text-gray-900 md:mx-10'>
      <h1 className='text-3xl font-medium'>Related Doctors</h1>
      <p className='sm:w-1/3 text-center text-sm'>Simply browse through our extensive list of trusted doctors.</p>

      <div className='w-full grid grid-cols-auto gap-4 pt-5 gap-y-6 px-3 sm:px-0'>
        {relDoc.slice(0, 5).map((item: Doctor, index: number) => (
          <div
            onClick={() => { navigate(`/appointments/${item._id}`); window.scrollTo(0, 0) }}
            className='border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500'
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
        ))}
      </div>

      <button
        onClick={() => { navigate('/doctors'); window.scrollTo(0, 0) }}
        className='bg-blue-50 text-gray-600 px-12 py-3 rounded-full mt-10'
      >
        more
      </button>
    </div>
  );
};

export default RelatedDoctors;