import React, { useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContext } from '../Context/AppContext'
import axios from 'axios'
import { toast } from 'sonner'

const ResetPassword = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const { backendUrl } = useContext(AppContext)
  const [newPassword, setNewPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/reset-password`, { token, newPassword })
      if (data.success) {
        toast.success(data.message)
        navigate('/login')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error("Failed to reset password")
    }
  }

  return (
    <div className='min-h-[80vh] flex items-center justify-center p-6'>
      <form onSubmit={handleSubmit} className='bg-white p-10 rounded-3xl shadow-lg border border-slate-100 max-w-md w-full'>
        <h2 className='text-2xl font-black text-slate-800 mb-6'>Set New Password</h2>
        <input
          type="password"
          placeholder="New Password (min 8 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className='medical-input w-full mb-4'
          required
        />
        <button type="submit" className='btn-primary w-full py-3'>
          Update Password
        </button>
      </form>
    </div>
  )
}

export default ResetPassword