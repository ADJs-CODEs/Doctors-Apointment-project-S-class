import React, { useContext, useState } from 'react'
import { AdminContext } from '../context/AdminContext.js'
import axios from 'axios'
import { toast } from 'sonner'
import { DoctorContext } from '../context/DoctorContext.js'
import type { AdminContextType, DoctorContextType } from '../types/index.js'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const Login: React.FC = () => {
  const navigate = useNavigate()

  const [state, setState] = useState<string>('Admin')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const { setAToken, backendUrl } = useContext(AdminContext) as AdminContextType;
  const { setDToken } = useContext(DoctorContext) as DoctorContextType;

  const onSubmitHandler = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      if (state === 'Admin') {
        const { data } = await axios.post(backendUrl + '/api/admin/login', { email, password })
        if (data.success) {
          localStorage.setItem('aToken', data.token)
          setAToken(data.token);
          navigate('/admin-dashboard')
          toast.success("Admin Access Granted")
        } else {
          toast.error(data.message)
        }
      } else {
        const { data } = await axios.post(backendUrl + '/api/doctor/login', { email, password })
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
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#F8F9FD] p-6 font-outfit'>
      <div className='w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-2 bg-white rounded-[40px] shadow-portal overflow-hidden animate-reveal'>

        {/* --- Branding Section --- */}
        <div className='hidden md:flex flex-col justify-center p-16 bg-teal-50/30 border-r border-slate-50'>

          {/* REBRANDED LOGO: Code-Based & Scaled Up */}
          <div className='flex items-center gap-4 mb-12'>
            <div className='w-14 h-14 bg-white rounded-full border-2 border-dotted border-teal-300 flex items-center justify-center shadow-sm shrink-0'>
              <div className='text-teal-600 font-black text-4xl leading-none'>+</div>
            </div>
            <div className='flex flex-col leading-tight'>
              <span className='text-2xl font-black text-slate-900 tracking-tighter uppercase'>
                ADJ's <span className='text-teal-600'>CODEs</span>
              </span>
              <span className='text-[11px] font-bold text-slate-400 uppercase tracking-[3px] -mt-1'>
                Pharmaceutical
              </span>
            </div>
          </div>

          <h2 className='text-5xl font-black text-slate-900 leading-[1.1]'>
            Welcome to the <br />
            <span className='text-teal-600'>{state} Portal</span>
          </h2>
          <p className='text-slate-500 mt-6 font-medium text-lg max-w-sm'>
            Secure access to ADJ's CODEs patient registries, appointment scheduling, and clinical analytics.
          </p>
        </div>

        {/* --- Form Section --- */}
        <div className='p-8 md:p-16 flex flex-col justify-center'>
          <form onSubmit={onSubmitHandler} className='space-y-6'>
            <div className='mb-8'>
              <p className='text-3xl font-black text-slate-900'>{state} Login</p>
              <div className='h-1.5 w-12 bg-teal-600 rounded-full mt-2'></div>
            </div>

            <div className='space-y-4'>
              <div className='space-y-1'>
                <p className='text-xs font-black text-slate-400 uppercase ml-2 tracking-widest'>Official Email</p>
                <input
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  className='admin-input focus:border-teal-600 transition-all'
                  type="email"
                  placeholder='admin@adjscodes.com'
                  required
                />
              </div>

              <div className='space-y-1'>
                <p className='text-xs font-black text-slate-400 uppercase ml-2 tracking-widest'>Security Password</p>
                <input
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  className='admin-input focus:border-teal-600 transition-all'
                  type="password"
                  placeholder='••••••••'
                  required
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              className='w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[2px] shadow-lg shadow-slate-900/10 hover:bg-teal-600 transition-all cursor-pointer'
            >
              Authorize {state} Access
            </motion.button>

            <div className='text-center mt-6'>
              <p className='text-sm font-bold text-slate-400'>
                {state === 'Admin' ? "Are you a Doctor?" : "Are you an Admin?"} {' '}
                <span
                  className='text-teal-600 font-black cursor-pointer hover:underline'
                  onClick={() => setState(state === 'Admin' ? 'Doctor' : 'Admin')}
                >
                  Switch Portal
                </span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login