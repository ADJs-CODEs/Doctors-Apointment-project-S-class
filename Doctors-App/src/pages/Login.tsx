import React, { useEffect, useState, useContext } from 'react'
import { AppContext } from '../Context/AppContext.js'
import axios from 'axios'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { AppContextType } from '../types/index.js'
import { useGoogleLogin } from '@react-oauth/google'
import {
  RiMailLine,
  RiLock2Line,
  RiUserLine,
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

  // --- GOOGLE LOGIN LOGIC ---
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setProgress(30)
        toast.info("Verifying credentials...")

        const { data } = await axios.post(`${backendUrl}/api/user/google-auth`, {
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
    toast.error("Apple Sign-In is coming soon to ADJ's CODEs.")
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
        toast.success(`Access Granted`)
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
    <div className='min-h-[85vh] flex items-center justify-center px-4 py-8 bg-slate-50/50'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        // Adjusted padding and radius for mobile vs desktop
        className='w-full max-w-md bg-white border border-slate-100 p-6 md:p-12 rounded-[32px] md:rounded-[48px] shadow-xl shadow-slate-200/50'
      >
        {/* Header Branding */}
        <div className='mb-8 text-center'>
          <div className='inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 rounded-full text-teal-600 mb-6 border border-teal-100/30'>
            <div className='w-4 h-4 bg-teal-600 rounded-full flex items-center justify-center text-white font-black text-[8px]'>+</div>
            <span className='text-[9px] font-black uppercase tracking-[2px]'>ADJ's CODEs Security</span>
          </div>

          <h2 className='text-2xl md:text-3xl font-black text-slate-900 mb-2 tracking-tight uppercase'>
            {state === 'Sign Up' ? "Join Network" : "Patient Login"}
          </h2>
          <p className='text-slate-400 text-xs font-medium'>
            {state === 'Sign Up'
              ? "Create your medical profile."
              : "Secure access to your health records."}
          </p>
        </div>

        {/* Social Auth Buttons */}
        <div className='grid grid-cols-2 gap-3 mb-8'>
          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            className='flex items-center justify-center gap-2 py-3 border border-slate-100 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all text-slate-600 font-black text-[9px] uppercase tracking-wider'
          >
            <RiGoogleFill size={16} className="text-teal-600" /> Google
          </button>
          <button
            type="button"
            onClick={handleAppleLogin}
            className='flex items-center justify-center gap-2 py-3 border border-slate-100 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all text-slate-600 font-black text-[9px] uppercase tracking-wider'
          >
            <RiAppleFill size={16} /> Apple
          </button>
        </div>

        <div className='relative mb-8'>
          <div className='absolute inset-0 flex items-center'><span className='w-full border-t border-slate-100'></span></div>
          <div className='relative flex justify-center text-[8px] uppercase font-black tracking-[3px] text-slate-300'>
            <span className='bg-white px-4'>Secure Portal</span>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={onSubmitHandler} className='space-y-3.5'>
          {state === 'Sign Up' && (
            <div className='relative group'>
              <input 
                type="text" 
                placeholder="Full Name" 
                className='w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:bg-white transition-all' 
                onChange={(e) => setName(e.target.value)} 
                value={name} 
                required 
              />
              <RiUserLine size={18} className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors' />
            </div>
          )}

          <div className='relative group'>
            <input 
              type="email" 
              placeholder="Email Address" 
              className='w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:bg-white transition-all' 
              onChange={(e) => setEmail(e.target.value)} 
              value={email} 
              required 
            />
            <RiMailLine size={18} className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors' />
          </div>

          <div className='relative group'>
            <input 
              type="password" 
              placeholder="Password" 
              className='w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:bg-white transition-all' 
              onChange={(e) => setPassword(e.target.value)} 
              value={password} 
              required 
            />
            <RiLock2Line size={18} className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors' />
          </div>

          {state === 'Login' && (
            <div className='flex justify-end'>
              <Link to='/forgot-password' title="Reset Password" className='text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 transition-colors'>
                Forgot Credentials?
              </Link>
            </div>
          )}

          <button 
            type='submit' 
            className='w-full flex items-center justify-center gap-3 mt-4 bg-slate-900 text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 active:scale-[0.98] transition-all shadow-lg shadow-slate-200'
          >
            {state === 'Sign Up' ? 'Initialize' : 'Authorize'}
            <RiArrowRightLine size={16} />
          </button>
        </form>

        <div className='mt-8 text-center border-t border-slate-50 pt-6'>
          <p className='text-slate-400 text-[10px] font-bold uppercase tracking-widest'>
            {state === 'Sign Up' ? 'Member?' : 'New Patient?'}
            <span 
              onClick={() => setState(state === 'Sign Up' ? 'Login' : 'Sign Up')} 
              className='ml-2 text-teal-600 cursor-pointer hover:underline font-black'
            >
              {state === 'Sign Up' ? 'Log In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default Login