import React from 'react'

// Defining the specific layout types allowed
interface SkeletonCardProps {
  type?: 'grid' | 'row'
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ type = 'grid' }) => {

  // 🚀 Vertical Grid Layout (For Home / Doctors page)
  if (type === 'grid') {
    return (
      <div className="border border-blue-100 rounded-xl overflow-hidden animate-pulse">
        <div className="bg-slate-200 h-48 w-full"></div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
            <div className="h-3 w-16 bg-slate-200 rounded"></div>
          </div>
          <div className="h-5 w-3/4 bg-slate-200 rounded"></div>
          <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  // 🚀 Horizontal Row Layout (For MyAppointments page)
  // This triggers when type is 'row'
  return (
    <div className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-4 border-b animate-pulse'>
      <div className='w-32 h-32 bg-slate-200 rounded-lg shadow-sm'></div>
      <div className='flex-1 space-y-3 py-1'>
        <div className='h-5 bg-slate-200 rounded w-1/3'></div>
        <div className='h-4 bg-slate-100 rounded w-1/4'></div>
        <div className='space-y-2 mt-4'>
          <div className='h-3 bg-slate-100 rounded w-1/2'></div>
          <div className='h-3 bg-slate-100 rounded w-1/2'></div>
        </div>
        <div className='h-4 bg-slate-200 rounded w-1/3 mt-4'></div>
      </div>
      <div className='flex flex-col gap-2 justify-end'>
        <div className='h-10 w-48 bg-slate-100 rounded-md'></div>
        <div className='h-10 w-48 bg-slate-100 rounded-md'></div>
      </div>
    </div>
  )
}

export default SkeletonCard