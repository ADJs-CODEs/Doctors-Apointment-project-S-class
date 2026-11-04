"use client";

import type React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiErrorWarningLine } from '@remixicon/react'

interface DoctorsAppointmentModalProps {
  showAlertModal: boolean
  alertForm: {
    message: string
    isCritical: boolean
  }
  setAlertForm: React.Dispatch<React.SetStateAction<{ message: string; isCritical: boolean }>>
  isSendingAlert: boolean
  handleSendAlert: () => void
  setShowAlertModal: React.Dispatch<React.SetStateAction<boolean>>
}

const DoctorsAppointmentModal = ({ showAlertModal, alertForm, setAlertForm, isSendingAlert, handleSendAlert, setShowAlertModal }: DoctorsAppointmentModalProps) => {
  return (
    <AnimatePresence>
      {showAlertModal && (
        <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowAlertModal(false)}>
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-6 sm:p-7"
          >
            <div className='flex items-center gap-3 mb-5'>
              <div className='w-12 h-12 rounded-2xl grid place-items-center bg-rose-50 border border-rose-100 text-rose-600'><RiErrorWarningLine size={22} /></div>
              <div>
                <h2 className='text-[20px] font-extrabold tracking-[-0.02em] text-ink'>Send an alert</h2>
                <p className='text-[14px] text-ink-2'>The patient gets it in the app and by email.</p>
              </div>
            </div>
            <textarea
              className='field resize-none mb-4'
              rows={4}
              placeholder="What should the patient know or do?"
              value={alertForm.message}
              onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
            />
            <label className='flex items-center justify-between gap-3 mb-6 rounded-2xl border border-line px-4 py-3 cursor-pointer'>
              <span className='text-[14px] font-bold text-ink-2'>Mark the patient as critical</span>
              <input type="checkbox" className='w-5 h-5 accent-rose-600 cursor-pointer' checked={alertForm.isCritical} onChange={(e) => setAlertForm({ ...alertForm, isCritical: e.target.checked })} />
            </label>
            <div className='flex flex-col-reverse sm:flex-row gap-2'>
              <button
                disabled={isSendingAlert}
                onClick={() => setShowAlertModal(false)}
                className='flex-1 px-5 py-3 rounded-xl border border-line bg-white text-ink-2 text-[15px] font-bold hover:bg-canvas'
              >
                Cancel
              </button>
              <button
                disabled={isSendingAlert}
                onClick={handleSendAlert}
                className='flex-1 px-5 py-3 rounded-xl bg-rose-600 text-white text-[15px] font-bold hover:bg-rose-700 disabled:opacity-50'
              >
                {isSendingAlert ? 'Sending…' : 'Send alert'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default DoctorsAppointmentModal
