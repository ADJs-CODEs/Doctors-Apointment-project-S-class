import React from 'react'
import { motion } from 'framer-motion'
import { RiMessage3Line, RiHeartPulseLine, RiDashboardLine, RiTempHotLine, RiMedicineBottleLine, RiCheckDoubleLine } from "@remixicon/react"
import { getDoseStatus, getAdherenceStats, } from "../utils/medicationUtils.js"
import type { HealthDropdownProps } from '../types/index.js'

const HealthDropdown: React.FC<HealthDropdownProps> = ({ isCritical, item, processingMed, latestMessage, logDose }) => {

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className={`rounded-[32px] md:rounded-[45px] p-6 md:p-12 text-white shadow-2xl overflow-hidden relative transition-all duration-700 ${isCritical ? 'bg-gradient-to-br from-red-950 via-slate-900 to-black' : 'bg-slate-900'}`}>

        {latestMessage && (
          <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={`mb-8 md:mb-12 p-5 md:p-6 rounded-[24px] md:rounded-[32px] border-l-4 md:border-l-8 flex gap-4 md:gap-5 items-start ${isCritical ? 'bg-white/5 border-red-500' : 'bg-white/5 border-teal-500'}`}>
            <div className={`${isCritical ? 'text-red-500' : 'text-teal-500'} mt-1 shrink-0`}>
              <RiMessage3Line size={24} />
            </div>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-[2px] mb-1 ${isCritical ? 'text-red-400' : 'text-teal-400'}`}>Doctor's Instructions</p>
              <p className='text-sm md:text-xl font-medium leading-relaxed text-slate-100 italic'>"{latestMessage.content}"</p>
            </div>
          </motion.div>
        )}

        <div className='mb-8 md:mb-12 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6'>
          {[
            { icon: <RiHeartPulseLine className='text-rose-400' size={24} />, label: 'Heart Rate', value: item.healthData?.heartRate, unit: 'BPM' },
            { icon: <RiDashboardLine className='text-blue-400' size={24} />, label: 'Blood Pressure', value: item.healthData?.bloodPressure, unit: '' },
            { icon: <RiTempHotLine className='text-orange-400' size={24} />, label: 'Temperature', value: item.healthData?.temperature, unit: '°C' }
          ].map((v, i) => (
            <div key={i} className='bg-white/5 border border-white/10 p-5 md:p-6 rounded-[24px] md:rounded-[32px]'>
              {v.icon}
              <p className='text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-3'>{v.label}</p>
              <p className='text-2xl md:text-3xl font-black mt-1'>{v.value || '--'} <span className='text-[10px] text-slate-500 font-medium'>{v.unit}</span></p>
            </div>
          ))}
        </div>

        <div className='space-y-6 md:space-y-8'>
          <h3 className='text-[9px] md:text-[11px] font-black uppercase tracking-[3px] text-teal-400'>Current Medication Plan</h3>
          <div className='grid gap-4 md:gap-6'>
            {item.healthData?.prescribedMedicines?.map((med: any) => {
              const { isEarly, hoursLeft } = getDoseStatus(med);
              const { rate } = getAdherenceStats(med);
              const isThisMedProcessing = processingMed === `${item._id}-${med.name}`;

              return (
                <div key={`${item._id}-${med.name}`} className={`bg-white/5 rounded-[24px] md:rounded-[35px] p-6 md:p-8 border transition-all duration-300 ${isEarly ? 'border-red-500/20' : 'border-white/10'}`}>
                  <div className='flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8'>
                    <div className='flex items-center gap-4 md:gap-6 flex-1 w-full'>
                      <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[24px] flex items-center justify-center shrink-0 ${isEarly ? 'bg-red-500/20 text-red-400' : 'bg-teal-500/20 text-teal-400'}`}>
                        <RiMedicineBottleLine size={24} className='md:size-[32px]' />
                      </div>
                      <div className='w-full'>
                        <p className='font-black text-xl md:text-2xl'>{med.name}</p>
                        <div className='flex flex-wrap items-center gap-2 mt-1'>
                          <p className='text-[9px] text-slate-400 uppercase font-black tracking-widest'>
                            {med.remainingQuantity <= 0 ? 'Cycle Completed' : `${med.remainingQuantity} Remaining`}
                          </p>
                          {isEarly && <span className='text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase'>Wait {hoursLeft}h</span>}
                          {!isEarly && med.remainingQuantity > 0 && <span className='text-[8px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse'>Safe</span>}
                        </div>

                        <div className='mt-4 w-full max-w-[200px] md:max-w-[240px]'>
                          <div className='flex justify-between items-center mb-1'>
                            <span className='text-[8px] font-black text-slate-500 uppercase'>Adherence</span>
                            <span className='text-[9px] font-black text-teal-400'>{rate}%</span>
                          </div>
                          <div className='h-1 w-full bg-white/5 rounded-full overflow-hidden'>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${rate}%` }}
                              className={`h-full rounded-full transition-all duration-700 ${rate > 80 ? 'bg-teal-500' : rate > 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => logDose(item._id, med.name, med)}
                      disabled={med.remainingQuantity <= 0 || !!processingMed}
                      className={`w-full md:w-auto px-8 py-4 md:px-10 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-[12px] uppercase tracking-[2px] transition-all active:scale-90 shadow-xl ${isThisMedProcessing ? 'bg-slate-700 animate-pulse text-slate-400' :
                        med.remainingQuantity <= 0 ? 'bg-white/10 text-slate-500 cursor-not-allowed' :
                          isEarly ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-teal-500 hover:bg-teal-400 text-slate-900'
                        }`}
                    >
                      {isThisMedProcessing ? 'Updating...' : med.remainingQuantity <= 0 ? <RiCheckDoubleLine className='mx-auto' size={18} /> : 'Confirm Dose'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default HealthDropdown
