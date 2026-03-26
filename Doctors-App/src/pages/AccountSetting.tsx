import React, { useState, useContext } from 'react'
import { AppContext } from '../Context/AppContext'
import axios from 'axios'
import { toast } from 'sonner'
import { RiLockPasswordLine, RiDeleteBin6Line, RiShieldUserLine } from '@remixicon/react'

const AccountSettings = () => {
  const { backendUrl, token, setToken } = useContext(AppContext)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/change-password`,
        { oldPassword, newPassword },
        { headers: { token } }
      )
      if (data.success) {
        toast.success(data.message)
        setOldPassword(''); setNewPassword('')
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error("Update failed")
    }
  }

  const handleDeleteAccount = async () => {
    if (window.confirm("WARNING: This will permanently delete your medical records. Proceed?")) {
      try {
        const { data } = await axios.post(`${backendUrl}/api/user/delete-account`, {}, { headers: { token } })
        if (data.success) {
          setToken(false)
          localStorage.removeItem('token')
          toast.success("Account deleted")
        }
      } catch (error) {
        toast.error("Could not delete account")
      }
    }
  }

  return (
    <div className='p-6 max-w-2xl mx-auto space-y-8'>
      <h2 className='text-2xl font-black flex items-center gap-2 text-slate-800'>
        <RiShieldUserLine className='text-teal-600' /> Account Security
      </h2>

      {/* Change Password Card */}
      <form onSubmit={handleChangePassword} className='bg-white p-8 rounded-3xl border border-slate-100 shadow-sm'>
        <p className='text-sm font-bold text-slate-500 mb-6 uppercase tracking-wider'>Update Password</p>
        <div className='space-y-4'>
          <input type="password" placeholder="Current Password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className='medical-input w-full' required />
          <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className='medical-input w-full' required />
          <button type="submit" className='btn-primary px-8 py-3 flex items-center gap-2'>
            <RiLockPasswordLine size={18} /> Update Security
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className='bg-red-50 p-8 rounded-3xl border border-red-100'>
        <p className='text-red-600 font-black text-xs uppercase tracking-[2px] mb-2'>Danger Zone</p>
        <h3 className='text-slate-800 font-bold mb-4'>Permanently Deactivate Account</h3>
        <p className='text-slate-500 text-sm mb-6'>Deleting your account will erase your prescription history and appointment logs. This action cannot be undone.</p>
        <button onClick={handleDeleteAccount} className='bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all flex items-center gap-2'>
          <RiDeleteBin6Line size={18} /> Purge Account Data
        </button>
      </div>
    </div>
  )
}

export default AccountSettings