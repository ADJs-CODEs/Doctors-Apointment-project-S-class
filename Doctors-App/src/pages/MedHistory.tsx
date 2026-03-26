import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../Context/AppContext.js'
import axios from 'axios'
import type { AppContextType, Appointment } from '../types/index.js'
import { motion } from 'framer-motion'
import { RiMedicineBottleLine, RiHistoryLine, RiHeartPulseLine, RiDashboardLine, RiTempHotLine } from "@remixicon/react"

const MedHistory: React.FC = () => {
  const { token, backendUrl } = useContext(AppContext) as AppContextType
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [latestVitals, setLatestVitals] = useState<any>(null)

  const fetchData = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
      if (data.success) {
        setAppointments(data.appointments.reverse())
        const latest = data.appointments.find((app: Appointment) => app.isCompleted && app.healthData)
        if (latest) setLatestVitals(latest.healthData)
      }
    } catch (error: any) {
      console.error(error.message)
    }
  }

  useEffect(() => { if (token) fetchData() }, [token])

  return (
    <div className='max-w-6xl mx-auto p-6 py-12'>
      {/* --- Quick Vitals Header --- */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-12'>
        <div className='glass-card-premium p-6 rounded-[30px] flex items-center gap-4'>
          <div className='p-3 bg-rose-500/10 rounded-2xl text-rose-600'><RiHeartPulseLine /></div>
          <div>
            <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Latest Pulse</p>
            <p className='text-2xl font-black text-slate-900'>{latestVitals?.heartRate || '--'} <span className='text-xs'>BPM</span></p>
          </div>
        </div>
        <div className='glass-card-premium p-6 rounded-[30px] flex items-center gap-4'>
          <div className='p-3 bg-blue-500/10 rounded-2xl text-blue-600'><RiDashboardLine /></div>
          <div>
            <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Latest BP</p>
            <p className='text-2xl font-black text-slate-900'>{latestVitals?.bloodPressure || '--'}</p>
          </div>
        </div>
        <div className='glass-card-premium p-6 rounded-[30px] flex items-center gap-4'>
          <div className='p-3 bg-orange-500/10 rounded-2xl text-orange-600'><RiTempHotLine /></div>
          <div>
            <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Latest Temp</p>
            <p className='text-2xl font-black text-slate-900'>{latestVitals?.temperature || '--'} <span className='text-xs'>°C</span></p>
          </div>
        </div>
      </div>

      <h1 className='text-3xl font-black text-slate-900 mb-8 flex items-center gap-3'>
        <RiMedicineBottleLine size={32} className='text-teal' />
        Pharmacy Vault
      </h1>

      <div className='space-y-6'>
        {appointments.map((app, idx) => (
          app.healthData?.prescribedMedicines?.length ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={app._id}
              className='glass-card-premium p-8 rounded-[40px] border-l-8 border-teal'
            >
              <div className='flex justify-between items-start mb-6'>
                <div>
                  <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Prescribed On</p>
                  <p className='font-bold text-slate-800'>{new Date(app.slotDate).toLocaleDateString()}</p>
                </div>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${app.isCompleted ? 'bg-teal/10 text-teal' : 'bg-amber-500/10 text-amber-600'}`}>
                  {app.isCompleted ? 'Completed Course' : 'In Progress'}
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {app.healthData.prescribedMedicines.map((med, i) => (
                  <div key={i} className='bg-white/80 border border-slate-100 p-5 rounded-3xl'>
                    <p className='font-black text-slate-900 text-lg'>{med.name}</p>
                    <div className='flex justify-between items-end mt-4'>
                      <p className='text-[10px] font-bold text-slate-400 uppercase'>{med.dosagePerDay} doses / day</p>
                      <p className='text-sm font-black text-teal'>{med.remainingQuantity} Left</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : null
        ))}
      </div>
    </div>
  )
}

export default MedHistory