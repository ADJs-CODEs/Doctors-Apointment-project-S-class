import React, { useState, useContext } from 'react'
import { AppContext } from '../Context/AppContext'
import axios from 'axios'
import { toast } from 'sonner'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const { backendUrl } = useContext(AppContext)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/forgot-password`, { email })
      if (data.success) {
        toast.success("Check your email for the reset link!")
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error("Something went wrong. Try again.")
    }
  }

  return (
    <div className='min-h-[80vh] flex items-center justify-center p-6'>
      <form onSubmit={handleSubmit} className='bg-white p-10 rounded-3xl shadow-lg border border-slate-100 max-w-md w-full'>
        <h2 className='text-2xl font-black text-slate-800 mb-2'>Reset Password</h2>
        <p className='text-slate-500 text-sm mb-6'>Enter your email and we'll send you a secure link to get back into your account.</p>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className='medical-input w-full mb-4'
          required
        />

        <button type="submit" className='btn-primary w-full py-3'>
          Send Reset Link
        </button>
      </form>
    </div>
  )
}

export default ForgotPassword