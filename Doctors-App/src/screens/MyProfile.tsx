"use client";

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { RiArrowRightSLine, RiCameraLine, RiCapsuleLine, RiPencilLine, RiUser3Line } from "@remixicon/react"
import axiosInstance from '../utils/axiosInstance'
import { API_PATHS } from '../utils/apiPath'
import VitalsCard from '../cards/VitalsCard'
import IconTile from '../components/brand/IconTile'
import { describeSchedule } from '../utils/medicationUtils'
import useMyProfile from '../hooks/useMyProfile'

// what a new account starts with, shown as "not added yet"
const UNSET = new Set(['', 'Not Selected', '0000000000'])
const shown = (v?: string) => (v && !UNSET.has(v) ? v : '')

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHOTO_MAX = 3 * 1024 * 1024

type Draft = { name: string; phone: string; gender: string; dob: string; line1: string; line2: string }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex justify-between gap-4 py-3 first:pt-0 last:pb-0'>
      <dt className='text-[14px] font-semibold text-ink-3'>{label}</dt>
      <dd className={`text-[15px] text-right ${value ? 'text-ink font-semibold' : 'text-ink-3'}`}>{value || 'Not added yet'}</dd>
    </div>
  )
}

const MyProfile: React.FC = () => {
  const { userData, image, setImage, loadUserProfileData, setIsEdit, getLatestHealthData, token, isEdit, latestAppointment, medicines, navigate } =
    useMyProfile()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (token) getLatestHealthData()
  }, [token])

  const startEditing = () => {
    if (!userData) return
    setDraft({
      name: userData.name ?? '',
      phone: shown(userData.phone),
      gender: shown(userData.gender),
      dob: shown(userData.dob),
      line1: userData.address?.line1 ?? '',
      line2: userData.address?.line2 ?? '',
    })
    setIsEdit(true)
  }

  const cancel = () => {
    setIsEdit(false)
    setImage(false)
    setDraft(null)
  }

  const pickPhoto = (file?: File) => {
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) return toast.error('Use a JPG, PNG or WebP photo')
    if (file.size > PHOTO_MAX) return toast.error('That photo is over 3 MB. Try a smaller one.')
    setImage(file)
  }

  const save = async () => {
    if (!userData || !draft) return
    if (!draft.name.trim()) return toast.error('Your name can’t be empty')
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', draft.name.trim())
      // the server needs every field; unanswered ones keep their "not set" value
      formData.append('phone', draft.phone.trim() || '0000000000')
      formData.append('gender', draft.gender || 'Not Selected')
      formData.append('dob', draft.dob || 'Not Selected')
      formData.append('address', JSON.stringify({ line1: draft.line1.trim(), line2: draft.line2.trim() }))
      if (image) formData.append('image', image)

      // FormData must go as multipart, or the shared client turns it into JSON and drops the photo
      const { data } = await axiosInstance.post(API_PATHS.USER.UPDATE_USER_PROFILE_DATA, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (data.success) {
        toast.success('Profile saved')
        await loadUserProfileData()
        cancel()
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Couldn’t save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!userData || !token) return null

  const photo = image ? URL.createObjectURL(image) : userData.image.replace('/upload/', '/upload/f_jpg,q_auto:best/')
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => (d ? { ...d, [k]: e.target.value } : d))
  const dobText = shown(userData.dob)
    ? new Date(`${userData.dob}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className='max-w-4xl mx-auto py-4 md:py-8 px-4 md:px-0 space-y-5'>
      {/* who */}
      <div className='glass rounded-[24px] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5'>
        <div className='relative shrink-0 self-center sm:self-auto'>
          <img src={photo} alt='' className='w-28 h-28 rounded-[28px] object-cover bg-brand-soft border-4 border-white shadow-[0_10px_24px_rgba(11,37,69,.12)]' />
          {isEdit && (
            <label className='absolute -bottom-2 -right-2 btn btn-ink !p-2.5 !rounded-full cursor-pointer' title='Change photo'>
              <RiCameraLine size={18} />
              <span className='sr-only'>Change photo</span>
              <input type='file' accept='image/jpeg,image/png,image/webp' hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </label>
          )}
        </div>
        <div className='flex-1 min-w-0 text-center sm:text-left'>
          <p className='eyebrow mb-1'>Your profile</p>
          <h1 className='text-[30px] leading-tight font-extrabold tracking-[-0.03em] text-ink truncate'>{userData.name}</h1>
          <p className='text-[15px] text-ink-3 truncate'>{userData.email}</p>
        </div>
        {!isEdit && (
          <button type='button' onClick={startEditing} className='btn btn-glass !bg-white self-center sm:self-auto'>
            <RiPencilLine size={17} /> Edit profile
          </button>
        )}
      </div>

      {/* details: read, or the form */}
      <section className='surface rounded-[24px] p-5 sm:p-6'>
        <h2 className='flex items-center gap-2.5 text-[16px] font-bold text-ink mb-4'>
          <IconTile>
            <RiUser3Line size={17} />
          </IconTile>
          Your details
        </h2>
        {isEdit && draft ? (
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='flex flex-col gap-1.5 sm:col-span-2'>
              <span className='text-[14px] font-bold text-ink'>Full name</span>
              <input className='field' value={draft.name} onChange={set('name')} autoComplete='name' />
            </label>
            <label className='flex flex-col gap-1.5'>
              <span className='text-[14px] font-bold text-ink'>Phone</span>
              <input className='field' type='tel' value={draft.phone} onChange={set('phone')} autoComplete='tel' placeholder='+234 …' />
            </label>
            <label className='flex flex-col gap-1.5'>
              <span className='text-[14px] font-bold text-ink'>Gender</span>
              <select className='field' value={draft.gender} onChange={set('gender')}>
                <option value=''>Prefer not to say</option>
                <option value='Male'>Male</option>
                <option value='Female'>Female</option>
              </select>
            </label>
            <label className='flex flex-col gap-1.5'>
              <span className='text-[14px] font-bold text-ink'>Date of birth</span>
              <input className='field' type='date' value={draft.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} />
              <span className='text-[13px] text-ink-3'>Needed to buy coins for Wish Well gifts (18+).</span>
            </label>
            <div className='hidden sm:block' />
            <label className='flex flex-col gap-1.5'>
              <span className='text-[14px] font-bold text-ink'>Address</span>
              <input className='field' value={draft.line1} onChange={set('line1')} autoComplete='address-line1' placeholder='Street and number' />
            </label>
            <label className='flex flex-col gap-1.5'>
              <span className='text-[14px] font-bold text-ink'>Area and city</span>
              <input className='field' value={draft.line2} onChange={set('line2')} autoComplete='address-level2' placeholder='e.g. Isolo, Lagos' />
            </label>
            <p className='text-[13px] text-ink-3 sm:col-span-2'>
              Your doctors see these details on your visits. For clinic distances and pharmacy delivery, set a home
              address in Settings.
            </p>
            <div className='flex flex-col-reverse sm:flex-row gap-2 sm:col-span-2 sm:justify-end'>
              <button type='button' onClick={cancel} disabled={saving} className='btn btn-glass !bg-white'>Cancel</button>
              <button type='button' onClick={save} disabled={saving} className='btn btn-ink'>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        ) : (
          <dl className='divide-y divide-line'>
            <Row label='Phone' value={shown(userData.phone)} />
            <Row label='Gender' value={shown(userData.gender)} />
            <Row label='Date of birth' value={dobText} />
            <Row label='Address' value={[userData.address?.line1, userData.address?.line2].filter(Boolean).join(', ')} />
          </dl>
        )}
      </section>

      <VitalsCard latestAppointment={latestAppointment} />

      {/* current medicines */}
      <section className='surface rounded-[24px] p-5 sm:p-6'>
        <div className='flex items-center justify-between gap-3 mb-4'>
          <h2 className='flex items-center gap-2.5 text-[16px] font-bold text-ink'>
            <IconTile>
              <RiCapsuleLine size={17} />
            </IconTile>
            Current medicines
          </h2>
          <button type='button' onClick={() => navigate('/medication-history')} className='flex items-center text-[13px] font-bold text-brand-ink hover:underline'>
            See all <RiArrowRightSLine size={16} />
          </button>
        </div>
        {medicines.length === 0 ? (
          <p className='text-[15px] text-ink-3'>No medicines to take right now.</p>
        ) : (
          <ul className='divide-y divide-line'>
            {medicines.map(({ appointmentId, med }) => (
              <li key={`${appointmentId}-${med.name}`}>
                <button
                  type='button'
                  onClick={() => navigate('/medication-history')}
                  className='w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-canvas -mx-2 px-2 rounded-xl transition-colors'
                >
                  <span className='min-w-0'>
                    <span className='block text-[15px] font-bold text-ink capitalize truncate'>{med.name}</span>
                    <span className='block text-[13px] text-ink-3'>{describeSchedule(med)}</span>
                  </span>
                  <span className='num shrink-0 text-[13px] text-brand-ink bg-brand-soft px-2 py-1 rounded-lg'>{med.remainingQuantity} left</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </motion.div>
  )
}

export default MyProfile
