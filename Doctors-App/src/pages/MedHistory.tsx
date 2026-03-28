import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../Context/AppContext.js'
import axios from 'axios'
import type { AppContextType, Appointment } from '../types/index.js'
import { motion } from 'framer-motion'
import { RiMedicineBottleLine, RiHeartPulseLine, RiDashboardLine, RiTempHotLine } from "@remixicon/react"

const MedHistory: React.FC = () => {
  const { token, backendUrl, setProgress } = useContext(AppContext) as AppContextType
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [latestVitals, setLatestVitals] = useState<any>(null)

  const fetchData = async () => {
    try {
      setProgress(30) // Progress bar start
      const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
      setProgress(70) // Data received
      if (data.success) {
        setAppointments(data.appointments.reverse())
        const latest = data.appointments.find((app: Appointment) => app.isCompleted && app.healthData)
        if (latest) setLatestVitals(latest.healthData)
      }
    } catch (error: any) {
      console.error(error.message)
    } finally {
      setProgress(100) // Progress bar complete
    }
  }

  useEffect(() => { if (token) fetchData() }, [token])

  return (
    <div className='max-w-6xl mx-auto p-4 sm:p-6 md:p-8 py-12'>
      {/* --- Quick Vitals Header - Responsive Grid --- */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-12'>
        {[
          { icon: <RiHeartPulseLine />, label: 'Latest Pulse', value: latestVitals?.heartRate, unit: 'BPM', color: 'text-rose-600', bg: 'bg-rose-500/10' },
          { icon: <RiDashboardLine />, label: 'Latest BP', value: latestVitals?.bloodPressure, unit: '', color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { icon: <RiTempHotLine />, label: 'Latest Temp', value: latestVitals?.temperature, unit: '°C', color: 'text-orange-600', bg: 'bg-orange-500/10' }
        ].map((vital, idx) => (
          <div key={idx} className='glass-card-premium p-5 md:p-6 rounded-[24px] md:rounded-[30px] flex items-center gap-4 transition-transform hover:scale-[1.02]'>
            <div className={`p-3 ${vital.bg} ${vital.color} rounded-2xl shrink-0`}>{vital.icon}</div>
            <div className='min-w-0'>
              <p className='text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate'>{vital.label}</p>
              <p className='text-xl md:text-2xl font-black text-slate-900 truncate'>
                {vital.value || '--'} <span className='text-xs font-bold text-slate-400'>{vital.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <h1 className='text-2xl md:text-3xl font-black text-slate-900 mb-6 md:mb-8 flex items-center gap-3'>
        <RiMedicineBottleLine size={32} className='text-teal shrink-0' />
        Pharmacy Vault
      </h1>

      <div className='space-y-6'>
        {appointments.map((app, idx) => (
          app.healthData?.prescribedMedicines?.length ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              key={app._id}
              className='glass-card-premium p-6 md:p-8 rounded-[30px] md:rounded-[40px] border-l-[6px] md:border-l-8 border-teal'
            >
              <div className='flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8'>
                <div>
                  <p className='text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest'>Prescribed On</p>
                  <p className='font-bold text-slate-800 text-sm md:text-base'>{new Date(app.slotDate).toLocaleDateString()}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider ${app.isCompleted ? 'bg-teal/10 text-teal' : 'bg-amber-500/10 text-amber-600'}`}>
                  {app.isCompleted ? 'Completed Course' : 'In Progress'}
                </div>
              </div>

              {/* Medicine Grid - Responsive layout for cards */}
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4'>
                {app.healthData.prescribedMedicines.map((med, i) => (
                  <div key={i} className='bg-white/80 border border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl hover:border-teal/30 transition-colors group cursor-default'>
                    <p className='font-black text-slate-900 text-base md:text-lg group-hover:text-teal transition-colors'>{med.name}</p>
                    <div className='flex justify-between items-end mt-4'>
                      <div className='space-y-1'>
                        <p className='text-[9px] md:text-[10px] font-bold text-slate-400 uppercase'>Frequency</p>
                        <p className='text-xs font-black text-slate-600 uppercase'>{med.dosagePerDay} doses / day</p>
                      </div>
                      <div className='text-right'>
                        <p className='text-[14px] md:text-sm font-black text-teal bg-teal-50 px-3 py-1 rounded-lg'>{med.remainingQuantity} Left</p>
                      </div>
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