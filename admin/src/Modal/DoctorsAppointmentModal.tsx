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
        <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 sm:p-8">
            <div className='flex items-center gap-3 mb-6'>
              <div className='p-3 bg-red-100 text-red-600 rounded-2xl'><RiErrorWarningLine size={24} /></div>
              <div>
                <h2 className='text-lg sm:text-xl font-black text-slate-900'>Send Alert</h2>
                <p className='text-[10px] font-bold text-slate-400 uppercase'>Direct Notification & Email</p>
              </div>
            </div>
            <textarea
              className='w-full p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-red-500 outline-none mb-4 font-medium'
              rows={4}
              placeholder="Type your medical warning here..."
              value={alertForm.message}
              onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
            />
            <div className='flex items-center justify-between mb-8 px-2'>
              <label className='text-xs font-bold text-slate-600'>Mark as Critical Risk?</label>
              <input type="checkbox" className='w-6 h-6 sm:w-5 sm:h-5 accent-red-500 rounded-lg cursor-pointer' checked={alertForm.isCritical} onChange={(e) => setAlertForm({ ...alertForm, isCritical: e.target.checked })} />
            </div>
            <div className='flex flex-col sm:flex-row gap-3'>
              <button
                disabled={isSendingAlert}
                onClick={() => setShowAlertModal(false)}
                className='order-2 sm:order-1 flex-1 py-4 text-xs font-black uppercase text-slate-400 active:scale-95 transition-all'
              >
                Cancel
              </button>
              <button
                disabled={isSendingAlert}
                onClick={handleSendAlert}
                className={`order-1 sm:order-2 flex-1 py-4 rounded-2xl text-xs font-black uppercase transition-all active:scale-95 ${isSendingAlert ? 'bg-slate-300 text-slate-500' : 'bg-red-500 text-white shadow-lg shadow-red-100'}`}
              >
                {isSendingAlert ? 'Sending...' : 'Send Alert'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default DoctorsAppointmentModal
