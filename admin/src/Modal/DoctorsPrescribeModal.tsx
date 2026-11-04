"use client";

import { useState } from 'react'
import { RiAddLine, RiCloseLine, RiDeleteBin6Line, RiHeartPulseLine, RiTempHotLine, RiTimeLine } from '@remixicon/react';
import type { DoctorsPrescribeModalProps, Medicine } from "../types/index"
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const VITALS = [
  { label: 'Blood pressure', key: 'bloodPressure', icon: <RiHeartPulseLine size={15} />, placeholder: '120/80' },
  { label: 'Pulse', key: 'heartRate', icon: <RiTimeLine size={15} />, placeholder: '72 bpm' },
  { label: 'Temperature', key: 'temperature', icon: <RiTempHotLine size={15} />, placeholder: '36.5' },
] as const

const NEW_MEDICINE: Medicine = { name: '', frequencyType: 'daily', frequencyValue: 1, dosagePerDay: 1, totalQuantity: 7, status: 'Active', remainingQuantity: 7, lastTaken: '' }

// the server reads dosagePerDay (doses a day, or hours between doses); older form state only had frequencyValue
const doseValue = (m: Medicine) => Number(m.dosagePerDay ?? m.frequencyValue ?? 1) || 1

/** Closing a visit: vitals, what was prescribed, notes. Used from the Schedule and the Dashboard. */
const DoctorsPrescribeModal = ({ showModal, resetForm, vitals, setVitals, setMedicines, medicines, completeAppointment, getAppointments, selectedApptId }: DoctorsPrescribeModalProps) => {
  const [saving, setSaving] = useState(false)

  const update = (index: number, patch: Partial<Medicine>) => setMedicines(medicines.map((m, i) => (i === index ? { ...m, ...patch } : m)))

  const submit = async () => {
    setSaving(true)
    try {
      const prescribedMedicines = medicines
        .filter((m) => m.name.trim())
        .map((m) => ({ ...m, dosagePerDay: doseValue(m) }))
      const success = await completeAppointment(selectedApptId, { ...vitals, prescribedMedicines })
      if (success) {
        toast.success("Visit completed")
        resetForm()
        await getAppointments()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4" onClick={resetForm}>
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="bg-white w-full max-w-3xl rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
          >
            <div className="px-5 sm:px-7 py-5 border-b border-line flex justify-between items-start gap-3 bg-white">
              <div>
                <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-ink leading-tight">Complete the visit</h2>
                <p className="text-[14px] text-ink-2 mt-0.5">Vitals, what you prescribed, and any notes. The patient sees these in their app.</p>
              </div>
              <button onClick={resetForm} aria-label="Close" className="p-2 rounded-xl text-ink-3 hover:bg-canvas">
                <RiCloseLine size={22} />
              </button>
            </div>

            <div className="px-5 sm:px-7 py-6 overflow-y-auto space-y-7 custom-scrollbar">
              <section>
                <h3 className="text-[16px] font-bold text-ink mb-3">Vitals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {VITALS.map((v) => (
                    <label key={v.key} className="block">
                      <span className="flex items-center gap-1.5 caption mb-1.5">
                        <span className="text-brand-ink">{v.icon}</span> {v.label}
                      </span>
                      <input
                        type="text"
                        className="field num"
                        placeholder={v.placeholder}
                        value={vitals[v.key]}
                        onChange={(e) => setVitals({ ...vitals, [v.key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[16px] font-bold text-ink">Prescription</h3>
                  <button
                    type="button"
                    onClick={() => setMedicines([...medicines, { ...NEW_MEDICINE }])}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[14px] font-bold text-brand-ink hover:bg-brand-soft"
                  >
                    <RiAddLine size={16} /> Add a medicine
                  </button>
                </div>

                {medicines.length === 0 ? (
                  <p className="text-[14px] text-ink-3 rounded-2xl border border-dashed border-line px-4 py-5 text-center">Nothing prescribed.</p>
                ) : (
                  <div className="space-y-3">
                    {medicines.map((med, index) => (
                      <div key={index} className="p-4 rounded-[18px] bg-canvas border border-line grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                        <label className="col-span-2 md:col-span-4 block">
                          <span className="block caption mb-1.5">Medicine</span>
                          <input className="field" placeholder="e.g. Amoxicillin 500mg" value={med.name} onChange={(e) => update(index, { name: e.target.value })} />
                        </label>
                        <label className="col-span-2 md:col-span-3 block">
                          <span className="block caption mb-1.5">How often</span>
                          <select className="field" value={med.frequencyType} onChange={(e) => update(index, { frequencyType: e.target.value as Medicine["frequencyType"] })}>
                            <option value="daily">Times a day</option>
                            <option value="interval">Every few hours</option>
                          </select>
                        </label>
                        <label className="md:col-span-2 block">
                          <span className="block caption mb-1.5">{med.frequencyType === 'interval' ? 'Every (hours)' : 'Doses a day'}</span>
                          <input
                            type="number"
                            min={1}
                            className="field num"
                            value={doseValue(med)}
                            onChange={(e) => update(index, { dosagePerDay: Number(e.target.value), frequencyValue: Number(e.target.value) })}
                          />
                        </label>
                        <label className="md:col-span-2 block">
                          <span className="block caption mb-1.5">Total doses</span>
                          <input
                            type="number"
                            min={1}
                            className="field num"
                            value={med.totalQuantity}
                            onChange={(e) => update(index, { totalQuantity: Number(e.target.value), remainingQuantity: Number(e.target.value) })}
                          />
                        </label>
                        <div className="col-span-2 md:col-span-1 flex justify-end md:justify-center md:pb-1.5">
                          <button
                            type="button"
                            onClick={() => setMedicines(medicines.filter((_, i) => i !== index))}
                            aria-label={`Remove ${med.name || 'this medicine'}`}
                            className="p-2 rounded-xl text-ink-3 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <RiDeleteBin6Line size={19} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <label className="block">
                <span className="block text-[16px] font-bold text-ink mb-3">Notes for the patient</span>
                <textarea
                  rows={3}
                  className="field resize-y"
                  placeholder="Instructions, what to watch for, when to come back…"
                  value={vitals.notes}
                  onChange={(e) => setVitals({ ...vitals, notes: e.target.value })}
                />
              </label>
            </div>

            <div className="px-5 sm:px-7 py-4 border-t border-line bg-canvas/60 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button onClick={resetForm} className="px-5 py-3 rounded-xl border border-line bg-white text-ink-2 text-[15px] font-bold hover:bg-canvas">
                Not now
              </button>
              <button onClick={submit} disabled={saving} className="btn btn-teal !rounded-xl !px-6 disabled:opacity-50">
                {saving ? "Saving…" : "Complete visit"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default DoctorsPrescribeModal
