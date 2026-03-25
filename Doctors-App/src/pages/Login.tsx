import React, { useEffect, useState, useContext } from 'react'
import { AppContext } from '../Context/AppContext.js'
import axios from 'axios'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { AppContextType } from '../types/index.js'
import {
  RiMailLine,
  RiLock2Line,
  RiUserLine,
  RiPulseFill,
  RiArrowRightLine,
  RiGoogleFill,
  RiAppleFill
} from "@remixicon/react"

const Login: React.FC = () => {
  const context = useContext(AppContext) as AppContextType;
  const { backendUrl, token, setToken, setProgress } = context;

  const navigate = useNavigate()

  const [state, setState] = useState<'Sign Up' | 'Login'>('Sign Up')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [name, setName] = useState<string>('')

  // Logic for Google Sign In (Placeholder for your Firebase/Auth0/Custom Logic)
  const handleSocialLogin = (platform: string) => {
    toast.info(`Connecting to ${platform} secure servers...`)
    // Here you would typically redirect to your backend auth route
    // window.location.href = `${backendUrl}/api/auth/${platform.toLowerCase()}`
  }

  const onSubmitHandler = async (event: React.BaseSyntheticEvent) => {
    event.preventDefault()
    try {
      setProgress(30)
      const endpoint = state === 'Sign Up' ? '/api/user/register' : '/api/user/login'
      const payload = state === 'Sign Up' ? { name, email, password } : { email, password }

      const { data } = await axios.post(`${backendUrl}${endpoint}`, payload)

      setProgress(70)
      if (data.success) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
        toast.success(`Access Granted: Welcome`)
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
    <div className='min-h-[90vh] flex items-center justify-center px-6 py-12 bg-clinic-bg'>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className='w-full max-w-md bg-white border border-slate-100 p-8 md:p-12 rounded-[48px] shadow-clinical'
      >
        {/* Header */}
        <div className='mb-10 text-center'>
          <div className='inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 rounded-full text-teal-600 mb-6'>
            <RiPulseFill size={16} className="animate-pulse" />
            <span className='text-[9px] font-black uppercase tracking-[2px]'>Validated Entry</span>
          </div>
          <h2 className='text-3xl font-black text-slate-900 mb-2 font-sans'>
            {state === 'Sign Up' ? 'Join Prescripto' : 'Patient Login'}
          </h2>
          <p className='text-slate-400 text-sm font-medium'>Secure medical data synchronization.</p>
        </div>

        {/* Social Auth Buttons */}
        <div className='grid grid-cols-2 gap-4 mb-8'>
          <button
            onClick={() => handleSocialLogin('Google')}
            className='flex items-center justify-center gap-3 py-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors text-slate-600 font-bold text-xs uppercase tracking-wider'
          >
            <RiGoogleFill size={18} className="text-red-500" /> Google
          </button>
          <button
            onClick={() => handleSocialLogin('Apple')}
            className='flex items-center justify-center gap-3 py-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors text-slate-600 font-bold text-xs uppercase tracking-wider'
          >
            <RiAppleFill size={18} /> Apple
          </button>
        </div>

        <div className='relative mb-8'>
          <div className='absolute inset-0 flex items-center'><span className='w-full border-t border-slate-100'></span></div>
          <div className='relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-300'>
            <span className='bg-white px-4'>Or use email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={onSubmitHandler} className='space-y-4'>
          {state === 'Sign Up' && (
            <div className='relative group'>
              <input type="text" placeholder="Full Name" className='medical-input pl-14 w-full' onChange={(e) => setName(e.target.value)} value={name} required />
              <RiUserLine size={20} className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-600 transition-colors' />
            </div>
          )}

          <div className='relative group'>
            <input type="email" placeholder="Email Address" className='medical-input pl-14 w-full' onChange={(e) => setEmail(e.target.value)} value={email} required />
            <RiMailLine size={20} className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-600 transition-colors' />
          </div>

          <div className='relative group'>
            <input type="password" placeholder="Password" className='medical-input pl-14 w-full' onChange={(e) => setPassword(e.target.value)} value={password} required />
            <RiLock2Line size={20} className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-600 transition-colors' />
          </div>

          <button type='submit' className='btn-primary w-full flex items-center justify-center gap-3 mt-4'>
            {state === 'Sign Up' ? 'Initialize' : 'Authorize'}
            <RiArrowRightLine size={20} />
          </button>
        </form>

        <div className='mt-10 text-center border-t border-slate-50 pt-8'>
          <p className='text-slate-400 text-[10px] font-bold uppercase tracking-widest'>
            {state === 'Sign Up' ? 'Already registered?' : 'Need an account?'}
            <span onClick={() => setState(state === 'Sign Up' ? 'Login' : 'Sign Up')} className='ml-2 text-teal-600 cursor-pointer hover:underline font-black'>
              {state === 'Sign Up' ? 'Login' : 'Register'}
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default Login