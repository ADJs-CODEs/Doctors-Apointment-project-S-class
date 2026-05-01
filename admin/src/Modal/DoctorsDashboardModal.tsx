import React from 'react'
import { RiAddLine, RiCloseLine, RiDeleteBin6Line, RiHeartPulseLine, RiTempHotLine, RiTimeLine } from '@remixicon/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DoctorsDashboardModalProps } from "../types/index.js"
import { toast } from 'sonner';

const DoctorsDashboardModal: React.FC<DoctorsDashboardModalProps> = ({ showModal, resetForm, vitals, setVitals, setMedicines, medicines, completeAppointment, selectedApptId, setProgress, getDashData }) => {
  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            className="bg-white w-full max-w-3xl rounded-t-4xl sm:rounded-4xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
          >

            <div className="p-5 sm:p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">Consultation</h2>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Vitals & Medication</p>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-90">
                <RiCloseLine size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto space-y-8 sm:space-y-10 custom-scrollbar">
              {/* Vitals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { label: 'BP', key: 'bloodPressure', icon: <RiHeartPulseLine size={16} />, placeholder: '120/80' },
                  { label: 'Pulse', key: 'heartRate', icon: <RiTimeLine size={16} />, placeholder: '72 bpm' },
                  { label: 'Temp', key: 'temperature', icon: <RiTempHotLine size={16} />, placeholder: '36.5' }
                ].map((v) => (
                  <div key={v.key} className="space-y-2">
                    <label className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase ml-2">{v.icon} {v.label}</label>
                    <input
                      type="text" className="w-full p-3 sm:p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-700"
                      placeholder={v.placeholder} value={(vitals as any)[v.key]} onChange={(e) => setVitals({ ...vitals, [v.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              {/* Medication */}
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[1px]">Medication Plan</p>
                  <button onClick={() => setMedicines([...medicines, { name: '', frequencyType: 'daily', frequencyValue: 1, totalQuantity: 7, status: 'Active', remainingQuantity: 7, lastTaken: '' }])} className="text-blue-600 font-bold text-[10px] sm:text-xs flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                    <RiAddLine size={16} /> Add Drug
                  </button>
                </div>

                <div className="space-y-4">
                  {medicines.map((med: any, index: any) => (
                    <div key={index} className="p-4 sm:p-5 bg-slate-50 rounded-[20px] sm:rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase ml-1">Drug Name</label>
                        <input className="w-full p-2.5 sm:p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none font-bold" placeholder="Name" value={med.name} onChange={(e) => { const n = [...medicines]; n[index].name = e.target.value; setMedicines(n); }} />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase ml-1">Frequency</label>
                        <select className="w-full p-2.5 sm:p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none font-bold" value={med.frequencyType} onChange={(e) => { const n = [...medicines]; n[index].frequencyType = e.target.value; setMedicines(n); }}>
                          <option value="daily">Daily (Days)</option>
                          <option value="interval">Hourly (Interval)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase ml-1">{med.frequencyType === 'daily' ? 'Days' : 'Hours'}</label>
                        <input type="number" className="w-full p-2.5 sm:p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none font-bold" value={med.frequencyValue} onChange={(e) => { const n = [...medicines]; n[index].frequencyValue = Number(e.target.value); setMedicines(n); }} />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase ml-1">Qty</label>
                        <input type="number" className="w-full p-2.5 sm:p-3 bg-white rounded-xl text-sm border-none shadow-sm outline-none font-bold" value={med.totalQuantity} onChange={(e) => { const n = [...medicines]; n[index].totalQuantity = Number(e.target.value); n[index].remainingQuantity = Number(e.target.value); setMedicines(n); }} />
                      </div>
                      <div className="md:col-span-1 flex justify-center md:pb-1">
                        <button onClick={() => setMedicines(medicines.filter((_: any, i: any) => i !== index))} className="p-2 text-red-300 hover:text-red-500 active:scale-90 transition-all"><RiDeleteBin6Line size={20} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase ml-2">Clinical Notes</label>
                <textarea rows={3} className="w-full p-4 sm:p-5 bg-slate-50 rounded-[20px] sm:rounded-3xl border-none outline-none text-sm font-medium" placeholder="Additional instructions..." value={vitals.notes} onChange={(e) => setVitals({ ...vitals, notes: e.target.value })} />
              </div>
            </div>

            <div className="p-6 sm:p-8 border-t bg-slate-50/50 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={resetForm} className="order-2 sm:order-1 flex-1 py-3 sm:py-4 text-[10px] sm:text-xs font-black uppercase text-slate-400 active:scale-95 transition-all">Cancel</button>
              <button
                onClick={async () => {
                  setProgress(40)
                  const success = await completeAppointment(selectedApptId, { ...vitals, prescribedMedicines: medicines });
                  if (success) {
                    setProgress(80)
                    toast.success("Appointment Processed");
                    resetForm();
                    await getDashData();
                    setProgress(100)
                  } else {
                    setProgress(100)
                  }
                }}
                className="order-1 sm:order-2 flex-2 py-4 bg-emerald-500 text-white rounded-xl sm:rounded-[20px] text-[10px] sm:text-xs font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Finalize Booking
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

  )
}

export default DoctorsDashboardModal
