"use client";

import React, { useState } from 'react'
import { Link } from "@/lib/navigation"
import { motion } from 'framer-motion'
import { RiArrowLeftLine, RiMailCheckLine } from '@remixicon/react'
import { toast } from 'sonner'
import { API_PATHS } from '../utils/apiPath'
import axiosInstance from '../utils/axiosInstance'

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.FORGOT_PASSWORD, { email })
      if (data.success) setSentTo(email.trim())
      else toast.error(data.message)
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-[70vh] flex items-center justify-center px-4 py-10'>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className='glass rounded-[28px] p-6 sm:p-9 max-w-[440px] w-full'
      >
        <Link to='/login' className='inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-3 hover:text-brand-ink mb-6'>
          <RiArrowLeftLine size={16} /> Back to log in
        </Link>

        {sentTo ? (
          <div className='flex flex-col gap-3'>
            <span className='w-12 h-12 rounded-xl grid place-items-center text-brand-ink border border-[#C4E8E5] bg-[linear-gradient(180deg,#EFFAF9,#D3F0EE)] shadow-[inset_0_1px_0_#fff,0_4px_10px_rgba(11,124,123,0.12)]'>
              <RiMailCheckLine size={22} />
            </span>
            <h2 className='text-[28px] leading-tight font-extrabold tracking-[-0.03em] text-ink'>Check your email</h2>
            <p className='text-[15px] text-ink-2'>
              If <b className='text-ink'>{sentTo}</b> has an account, a link to choose a new password is on its way.
              It can take a minute; check your spam folder too.
            </p>
            <button type='button' onClick={() => setSentTo('')} className='btn btn-glass mt-3'>
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h2 className='text-[28px] leading-tight font-extrabold tracking-[-0.03em] text-ink'>Forgot your password?</h2>
            <p className='text-[15px] text-ink-3 mt-1.5 mb-6'>
              Enter the email you signed up with and we&apos;ll send you a link to choose a new one.
            </p>
            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
              <label className='flex flex-col gap-1.5'>
                <span className='text-[14px] font-bold text-ink'>Email</span>
                <input
                  type="email"
                  autoComplete='email'
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='field'
                  required
                />
              </label>
              <button disabled={loading} type="submit" className='btn btn-ink w-full mt-1'>
                {loading ? 'Sending…' : 'Send me a link'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}

export default ForgotPassword
