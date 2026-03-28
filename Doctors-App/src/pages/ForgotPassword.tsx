import React, { useState, useContext } from 'react'
import { AppContext } from '../Context/AppContext.js'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RiMailSendLine, RiArrowLeftLine, RiLoader4Line } from '@remixicon/react'
import axios from 'axios'
import { toast } from 'sonner'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { backendUrl } = useContext(AppContext)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data } = await axios.post(`${backendUrl}/api/user/forgot-password`, { email })
      if (data.success) {
        toast.success("Check your email for the reset link!")
        setEmail('') // Clear input on success
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-[85vh] flex items-center justify-center p-4 sm:p-6'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='bg-white p-8 md:p-12 rounded-[32px] md:rounded-[48px] shadow-clinical border border-slate-100 max-w-md w-full relative overflow-hidden'
      >
        {/* Subtle Background Glow */}
        <div className='absolute -top-24 -right-24 w-48 h-48 bg-teal-500/5 blur-[60px] rounded-full pointer-events-none' />

        {/* Back to Login */}
        <button
          onClick={() => navigate('/login')}
          className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 transition-colors mb-8 group'
        >
          <RiArrowLeftLine size={14} className='group-hover:-translate-x-1 transition-transform' />
          Back to Security Portal
        </button>

        <div className='w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-6'>
          <RiMailSendLine size={28} />
        </div>

        <h2 className='text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mb-3'>
          Recover <span className='text-teal-500 font-serif normal-case italic'>Access</span>
        </h2>
        <p className='text-slate-500 text-xs md:text-sm font-medium mb-8 leading-relaxed'>
          Enter your registered email and we'll send you a secure link to reset your <span className='text-slate-900 font-bold'>ADJ's CODEs</span> credentials.
        </p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='relative'>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:border-teal-500/50 focus:bg-white transition-all placeholder:text-slate-400'
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            type="submit"
            className='w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-slate-900/10 hover:bg-teal-500 transition-all flex items-center justify-center gap-3 disabled:opacity-70'
          >
            {loading ? (
              <RiLoader4Line size={20} className='animate-spin' />
            ) : (
              "Send Secure Link"
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}

export default ForgotPassword