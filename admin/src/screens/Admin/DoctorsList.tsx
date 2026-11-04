"use client";

import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { RiDeleteBin7Line, RiFilter3Line, RiSearchLine, RiUserAddLine } from '@remixicon/react'
import { useNavigate } from '@/lib/navigation'
import ConfirmDialog from '../../components/ConfirmDialog'
import { PageHeader, Skeleton } from '../../components/panel'
import type { AdminContextType, Doctor } from '../../types/index'

const SPECIALITIES = ['All', 'General physician', 'Gynecologist', 'Dermatologist', 'Pediatricians', 'Neurologist', 'Gastroenterologist']

const DoctorList: React.FC = () => {
  const navigate = useNavigate()
  const { doctors, aToken, getAllDoctors, changeAvailability, deleteDoctor } = useContext(AdminContext) as AdminContextType

  const [searchTerm, setSearchTerm] = useState('')
  const [specialityFilter, setSpecialityFilter] = useState('All')
  const [removing, setRemoving] = useState<Doctor | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (aToken) getAllDoctors()
  }, [aToken, getAllDoctors])

  const filteredDocs = useMemo(() => {
    let result = Array.isArray(doctors) ? [...doctors] : []
    if (searchTerm) result = result.filter(doc => doc?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    if (specialityFilter !== 'All') result = result.filter(doc => doc?.speciality === specialityFilter)
    return result
  }, [doctors, searchTerm, specialityFilter])

  return (
    <div className='p-4 sm:p-6 lg:p-8 animate-reveal'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-6'>
          <PageHeader
            eyebrow='The clinic'
            title='Doctors'
            subtitle='Who is taking bookings, and who is paused.'
            action={
              <button type='button' onClick={() => navigate('/add-doctor')} className='btn btn-teal !rounded-xl'>
                <RiUserAddLine size={17} /> Add a doctor
              </button>
            }
          />
        </div>

        <div className='flex flex-col md:flex-row md:items-center gap-3 mb-6'>
          <label className='relative block md:w-80 shrink-0'>
            <RiSearchLine size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3' />
            <input type='text' placeholder='Search by name' className='field !pl-10' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </label>
          <div className='flex gap-1.5 overflow-x-auto hide-scrollbar pb-1'>
            {SPECIALITIES.map((spec) => (
              <button
                key={spec}
                type='button'
                onClick={() => setSpecialityFilter(spec)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-[14px] font-bold transition-colors ${
                  specialityFilter === spec ? 'btn-ink' : 'bg-white border border-line text-ink-2 hover:border-ink-3/40'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {!doctors ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className='h-80' />)}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className='surface rounded-[24px] py-20 text-center'>
            <div className='w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand-ink mb-4 mx-auto'>
              <RiFilter3Line size={24} />
            </div>
            <p className='font-bold text-ink'>No doctors found</p>
            <p className='text-ink-3 text-[14px] mt-1'>Try another name or speciality.</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
            {filteredDocs.map((item, index) => {
              const isAvailable = item?.available ?? false
              return (
                <div key={item?._id || index} className='group surface rounded-[24px] overflow-hidden relative'>
                  <div className='relative aspect-[4/3] overflow-hidden bg-brand-soft'>
                    <img
                      className='w-full h-full object-cover object-top'
                      src={item?.image?.replace('/upload/', '/upload/f_jpg,q_auto:best,w_500,h_500,c_fill/')}
                      alt={item?.name}
                    />
                    <span
                      className={`absolute top-3 right-3 inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full glass ${
                        isAvailable ? 'text-brand-ink' : 'text-ink-2'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-brand' : 'bg-ink-3'}`} />
                      {isAvailable ? 'Taking bookings' : 'Paused'}
                    </span>
                  </div>

                  <div className='p-5'>
                    <p className='text-[13px] font-semibold text-brand-ink mb-0.5'>{item?.speciality}</p>
                    <h3 className='text-[17px] font-bold text-ink truncate'>{item?.name}</h3>

                    <div className='flex items-center justify-between gap-3 pt-4 mt-4 border-t border-line'>
                      <label className='flex items-center gap-2.5 cursor-pointer'>
                        <button
                          type='button'
                          role='switch'
                          aria-checked={isAvailable}
                          aria-label={`${item?.name} is taking bookings`}
                          onClick={() => item?._id && changeAvailability(item._id)}
                          className={`w-11 h-6 rounded-full p-1 transition-colors ${isAvailable ? 'bg-brand' : 'bg-line'}`}
                        >
                          <span className={`block w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isAvailable ? 'translate-x-5' : ''}`} />
                        </button>
                        <span className='text-[14px] font-semibold text-ink-2'>Bookings</span>
                      </label>
                      <button
                        type='button'
                        onClick={() => setRemoving(item)}
                        title='Remove this doctor'
                        aria-label={`Remove ${item?.name}`}
                        className='p-2 rounded-xl border border-line text-ink-3 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                      >
                        <RiDeleteBin7Line size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removing?.name ?? 'this doctor'}?`}
        body='Their account and login are deleted for good. This can’t be undone.'
        confirmLabel='Remove doctor'
        tone='rose'
        busy={busy}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return
          setBusy(true)
          try {
            await deleteDoctor(removing._id)
          } finally {
            setBusy(false)
            setRemoving(null)
          }
        }}
      />
    </div>
  )
}

export default DoctorList
