import React from 'react'

interface AvailabilityProps {
  isEdit: boolean
  tempData?: { available: boolean } | null
  setTempData: React.Dispatch<React.SetStateAction<{ available: boolean } | null>>
  profileData: { available: boolean }
}

const Availabilty: React.FC<AvailabilityProps> = ({ isEdit, tempData, setTempData, profileData }) => {
  return (
    <div className='flex items-center gap-3 mt-8 p-4 bg-slate-50 rounded-2xl w-full sm:w-fit active:scale-95 transition-all cursor-pointer'>
      <input
        className='w-5 h-5 accent-teal-600 cursor-pointer'
        onChange={() => isEdit && tempData && setTempData({ ...tempData, available: !tempData.available })}
        checked={isEdit && tempData ? tempData.available : profileData.available}
        type="checkbox"
        id='available'
      />
      <label htmlFor="available" className='text-sm font-bold text-slate-700 cursor-pointer flex-1'>
        Accepting New Patients
      </label>
    </div>

  )
}

export default Availabilty
