import React, { useEffect, useState, useContext } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { AppContextType } from '../types/index.js'
import { useGoogleLogin } from '@react-oauth/google'
import {
  RiMailLine,
  RiLock2Line,
  RiUserLine,
  RiPulseFill,
  RiArrowRightLine,
  RiGoogleFill,
  RiAppleFill
} from "@remixicon/react"
import axiosInstance from '../utils/axiosInstance.js'
import { API_PATHS } from '../utils/apiPath.js'

const Login: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { token, setToken, setProgress } = context;

  const navigate = useNavigate()
  const [state, setState] = useState<'Sign Up' | 'Login'>('Sign Up')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [name, setName] = useState<string>('')

  // --- GOOGLE LOGIN LOGIC ---
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setProgress(30)
        toast.info("Verifying credentials with ADJ's CODEs...")

        const { data } = await axiosInstance.post(API_PATHS.AUTH.GOOGLE_AUTH, {
          access_token: tokenResponse.access_token
        })

        if (data.success) {
          localStorage.setItem('token', data.token)
          setToken(data.token)
          toast.success(`Welcome back, ${data.name.split(' ')[0]}!`)
        } else {
          toast.error(data.message)
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Authentication failed")
      } finally {
        setProgress(100)
      }
    },
    onError: () => toast.error("Connection interrupted")
  })

  const handleAppleLogin = () => {
    toast.error("Apple Sign-In is currently in development for ADJ's CODEs.")
  }

  const onSubmitHandler = async (event: React.BaseSyntheticEvent) => {
    event.preventDefault()
    try {
      setProgress(30)
      const endpoint = state === 'Sign Up' ? API_PATHS.AUTH.REGISTER : API_PATHS.AUTH.LOGIN
      const payload = state === 'Sign Up' ? { name, email, password } : { email, password }

      const { data } = await axiosInstance.post(endpoint, payload)

      setProgress(70)
      if (data.success) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
        toast.success(`Access Granted to Patient Portal`)
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Connection failed")
    } finally {
      setProgress(100)
    }
  }

  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  return (
    <div className='min-h-[90vh] flex items-center justify-center px-4 sm:px-8 md:px-12 py-12 bg-clinic-bg'>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        // Added max-w-lg for tablets to keep the form centered and readable
        className='w-full max-w-md lg:max-w-lg bg-white border border-slate-100 p-6 sm:p-10 md:p-12 rounded-[40px] md:rounded-[48px] shadow-clinical'
      >
        {/* Header Branding */}
        <div className='mb-8 md:mb-10 text-center'>
          <div className='inline-flex items-center gap-2 px-5 py-2 bg-teal-50 rounded-full text-teal-600 mb-6 md:mb-8 border border-teal-100/50'>
            <div className='w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center text-white font-black text-[10px]'>+</div>
            <span className='text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[2px] md:tracking-[2.5px]'>ADJ's CODEs Verified</span>
          </div>

          <h2 className='text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight'>
            {state === 'Sign Up' ? "Join the Network" : "Patient Access"}
          </h2>
          <p className='text-slate-400 text-xs sm:text-sm font-medium px-2'>
            {state === 'Sign Up'
              ? "Create your ADJ's CODEs medical profile."
              : "Secure medical data synchronization."}
          </p>
        </div>

        {/* Social Auth Buttons - Tab/Medium Screen optimization */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-8'>
          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            className='flex items-center justify-center gap-3 py-3 md:py-3.5 border border-slate-100 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all text-slate-600 font-black text-[10px] uppercase tracking-wider w-full'
          >
            <RiGoogleFill size={18} className="text-teal-600" /> Google
          </button>
          <button
            type="button"
            onClick={handleAppleLogin}
            className='flex items-center justify-center gap-3 py-3 md:py-3.5 border border-slate-100 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all text-slate-600 font-black text-[10px] uppercase tracking-wider w-full'
          >
            <RiAppleFill size={18} /> Apple
          </button>
        </div>

        <div className='relative mb-8'>
          <div className='absolute inset-0 flex items-center'><span className='w-full border-t border-slate-100'></span></div>
          <div className='relative flex justify-center text-[8px] md:text-[9px] uppercase font-black tracking-[3px] text-slate-300'>
            <span className='bg-white px-4 md:px-6'>Official Registry</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={onSubmitHandler} className='space-y-4'>
          {state === 'Sign Up' && (
            <div className='relative group'>
              <input type="text" placeholder="Your Full Name" className='medical-input pl-14 w-full focus:border-teal-600 transition-all text-sm h-12 md:h-14' onChange={(e) => setName(e.target.value)} value={name} required />
              <RiUserLine size={20} className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-600 transition-colors' />
            </div>
          )}

          <div className='relative group'>
            <input type="email" placeholder="patient@adjscodes.com" className='medical-input pl-14 w-full focus:border-teal-600 transition-all text-sm h-12 md:h-14' onChange={(e) => setEmail(e.target.value)} value={email} required />
            <RiMailLine size={20} className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-600 transition-colors' />
          </div>

          <div className='relative group'>
            <input type="password" placeholder="Security Password" className='medical-input pl-14 w-full focus:border-teal-600 transition-all text-sm h-12 md:h-14' onChange={(e) => setPassword(e.target.value)} value={password} required />
            <RiLock2Line size={20} className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-600 transition-colors' />
          </div>

          {state === 'Login' && (
            <div className='flex justify-end mt-1'>
              <Link to='/forgot-password' className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 transition-colors'>
                Reset Access Credentials?
              </Link>
            </div>
          )}

          <button type='submit' className='w-full flex items-center justify-center gap-3 mt-4 bg-slate-900 hover:bg-teal-600 active:scale-[0.98] transition-all py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg'>
            {state === 'Sign Up' ? 'Initialize Profile' : 'Authorize Session'}
            <RiArrowRightLine size={18} />
          </button>
        </form>

        {/* Footer Toggle */}
        <div className='mt-8 md:mt-10 text-center border-t border-slate-50 pt-6 md:pt-8'>
          <p className='text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest leading-relaxed'>
            {state === 'Sign Up' ? 'Already in the registry?' : 'New patient?'}
            <span onClick={() => setState(state === 'Sign Up' ? 'Login' : 'Sign Up')} className='block sm:inline-block sm:ml-2 text-teal-600 cursor-pointer hover:underline font-black mt-2 sm:mt-0'>
              {state === 'Sign Up' ? 'Authorize Access' : 'Register Now'}
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default Login