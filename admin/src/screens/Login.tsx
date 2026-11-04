"use client";

import React, { useContext, useState } from "react"
import { AdminContext } from "../context/AdminContext"
import { toast } from "sonner"
import { DoctorContext } from "../context/DoctorContext"
import { AppContext } from "../context/AppContext" // Added AppContext for progress bar
import type { AdminContextType, DoctorContextType, AppContextType } from "../types/index"
import { useNavigate } from "@/lib/navigation"
import { API_PATHS } from "../utils/apiPath"
import axiosInstance from "../utils/axiosInstance"
import { usePharmacy } from "../context/PharmacyContext"
import PharmacyApply from "./Pharmacy/PharmacyApply"

const PORTALS = ['Admin', 'Doctor', 'Pharmacy'] as const

const Login: React.FC = () => {
  const navigate = useNavigate()

  const [state, setState] = useState<(typeof PORTALS)[number]>('Admin')
  const [applying, setApplying] = useState(false)
  const { setPToken } = usePharmacy()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const { setAToken } = useContext(AdminContext) as AdminContextType;
  const { setDToken } = useContext(DoctorContext) as DoctorContextType;
  const { setProgress } = useContext(AppContext) as AppContextType; // Progress Bar Logic

  const [busy, setBusy] = useState(false)

  const onSubmitHandler = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      if (state === 'Admin') {
        const { data } = await axiosInstance.post(API_PATHS.AUTH.A_LOGIN, { email, password })
        if (data.success) {
          localStorage.setItem('aToken', data.token)
          setAToken(data.token);
          navigate('/admin-dashboard')
          toast.success("Admin Access Granted")
        } else {
          toast.error(data.message)
        }
      } else if (state === 'Pharmacy') {
        const { data } = await axiosInstance.post(API_PATHS.PHARMACY.LOGIN, { email, password })
        if (data.success) {
          setPToken(data.token)
          navigate('/pharmacy')
          toast.success('Welcome back')
        } else {
          toast.error(data.message)
        }
      } else {
        const { data } = await axiosInstance.post(API_PATHS.AUTH.D_LOGIN, { email, password })
        if (data.success) {
          localStorage.setItem('dToken', data.token)
          setDToken(data.token);
          navigate('/doctor-dashboard')
          toast.success("Doctor Access Granted")
        } else {
          toast.error(data.message)
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = {
    Admin: { title: 'For the clinic team', text: 'Doctors, bookings, the Wish Well, pharmacies, payouts and finance, all in one place.' },
    Doctor: { title: 'For doctors', text: 'Your schedule, your patients and their doses, messages, calls and your earnings.' },
    Pharmacy: { title: 'For pharmacies', text: 'Your products and stock, the orders patients send you, your staff and your earnings.' },
  }[state]

  return (
    <div className='relative isolate min-h-screen flex items-center justify-center bg-canvas p-4 sm:p-6 overflow-hidden'>
      <div aria-hidden='true' className='absolute -z-10 rounded-full blur-[60px] opacity-50 w-[46vw] h-[46vw] bg-[#CDEFED] -right-[12vw] -top-[10vw]' />
      <div aria-hidden='true' className='absolute -z-10 rounded-full blur-[60px] opacity-50 w-[40vw] h-[40vw] bg-[#DCE3FA] -left-[14vw] top-[40vh]' />
      <div className='w-full max-w-[1040px] grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] items-center animate-reveal'>
        {/* who it's for (wide screens) */}
        <div className='hidden md:flex flex-col gap-5 pr-6'>
          <div className='flex items-baseline gap-2'>
            <b className='text-[22px] font-extrabold tracking-[-0.5px] text-ink'>Clarity</b>
            <span className='text-[13px] font-semibold text-ink-3'>clinic panel</span>
          </div>
          <p className='eyebrow'>{copy.title}</p>
          <h1 className='text-[46px] leading-[1.03] font-extrabold tracking-[-0.035em] text-ink text-balance'>
            Everything behind the care, in one place.
          </h1>
          <p className='text-[17px] text-ink-2 max-w-[42ch]'>{copy.text}</p>
        </div>

        {/* the form */}
        <div className='glass !bg-white/85 rounded-[26px] p-6 sm:p-8'>
          <div className='md:hidden flex items-baseline gap-2 mb-6'>
            <b className='text-[20px] font-extrabold tracking-[-0.5px] text-ink'>Clarity</b>
            <span className='text-[12px] font-semibold text-ink-3'>clinic panel</span>
          </div>

          {applying ? (
            <PharmacyApply onDone={() => setApplying(false)} />
          ) : (
            <form onSubmit={onSubmitHandler} className='flex flex-col gap-5'>
              {/* which portal */}
              <div role='tablist' aria-label='Log in as' className='grid grid-cols-3 gap-1 p-1 bg-canvas border border-line rounded-[14px]'>
                {PORTALS.map((p) => (
                  <button
                    key={p}
                    type='button'
                    role='tab'
                    aria-selected={state === p}
                    onClick={() => setState(p)}
                    className={`py-2 rounded-[11px] text-[14px] font-bold transition-colors ${state === p ? 'btn-ink' : 'text-ink-3 hover:text-ink'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div>
                <h2 className='text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-ink'>
                  {state === 'Admin' ? 'Clinic team log in' : `${state} log in`}
                </h2>
                <p className='text-[14px] text-ink-3 mt-1'>Use the email and password you were given.</p>
              </div>

              <label className='flex flex-col gap-1.5'>
                <span className='text-[14px] font-bold text-ink'>Email</span>
                <input
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  className='field'
                  type='email'
                  autoComplete='email'
                  required
                />
              </label>

              <label className='flex flex-col gap-1.5'>
                <span className='text-[14px] font-bold text-ink'>Password</span>
                <input
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  className='field'
                  type='password'
                  autoComplete='current-password'
                  required
                />
              </label>

              <button type='submit' disabled={busy} className='btn btn-ink w-full mt-1'>
                {busy ? 'One moment…' : 'Log in'}
              </button>

              {state === 'Pharmacy' && (
                <p className='text-center text-[14px] text-ink-3'>
                  New pharmacy?{' '}
                  <button type='button' onClick={() => setApplying(true)} className='font-bold text-brand-ink hover:underline'>
                    Apply to sell
                  </button>
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login