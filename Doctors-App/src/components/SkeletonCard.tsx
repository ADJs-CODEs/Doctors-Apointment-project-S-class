import React from 'react'

interface SkeletonCardProps {
  type?: 'grid' | 'row'
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ type = 'grid' }) => {

  // 🚀 Vertical Grid Layout (Matches TopDoctors / RelatedDoctors)
  if (type === 'grid') {
    return (
      <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-clinical animate-pulse">
        {/* Doctor Image Placeholder */}
        <div className="bg-slate-100 aspect-[4/5] w-full"></div>

        <div className="p-6 space-y-4">
          {/* Availability Badge Placeholder */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
            <div className="h-2 w-24 bg-slate-100 rounded-full"></div>
          </div>

          {/* Name and Speciality Placeholder */}
          <div className="space-y-2">
            <div className="h-5 w-3/4 bg-slate-200 rounded-lg"></div>
            <div className="h-3 w-1/2 bg-slate-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  // 🚀 Horizontal Row Layout (Matches MyAppointments / Profile)
  return (
    <div className='flex flex-col md:flex-row gap-8 py-8 border-b border-slate-50 animate-pulse items-center md:items-start'>

      {/* Profile/Doctor Image Square */}
      <div className='w-40 h-40 bg-slate-100 rounded-[32px] shrink-0 shadow-sm'></div>

      {/* Content Info */}
      <div className='flex-1 space-y-5 w-full text-center md:text-left'>
        <div className='space-y-2'>
          <div className='h-6 bg-slate-200 rounded-xl w-1/2 mx-auto md:mx-0'></div>
          <div className='h-4 bg-slate-100 rounded-lg w-1/4 mx-auto md:mx-0'></div>
        </div>

        <div className='space-y-3 pt-2'>
          <div className='h-3 bg-slate-50 rounded-full w-full'></div>
          <div className='h-3 bg-slate-50 rounded-full w-2/3 mx-auto md:mx-0'></div>
        </div>

        <div className='flex gap-4 justify-center md:justify-start pt-4'>
          <div className='h-8 w-24 bg-teal-50/50 rounded-full'></div>
          <div className='h-8 w-24 bg-slate-50 rounded-full'></div>
        </div>
      </div>

      {/* Action Buttons Column */}
      <div className='flex flex-col gap-3 justify-center w-full md:w-auto px-6 md:px-0'>
        <div className='h-12 w-full md:w-48 bg-slate-100 rounded-2xl'></div>
        <div className='h-12 w-full md:w-48 bg-slate-50 rounded-2xl'></div>
      </div>
    </div>
  )
}

export default SkeletonCard