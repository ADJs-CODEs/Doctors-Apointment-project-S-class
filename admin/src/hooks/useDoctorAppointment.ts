import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext.js'
import type { AppContextType, DoctorContextType, Medicine } from '../types/index.js'
import { DoctorContext } from '../context/DoctorContext.js'
import { toast } from 'sonner'
import axiosInstance from '../utils/axiosInstance.js'
import { API_PATHS } from '../utils/apiPath.js'

const useDoctorAppointment = () => {

  const { dToken, appointments, getAppointments, completeAppointment, cancelAppointment } = useContext(DoctorContext) as DoctorContextType
  const { calculateAge, slotDateFormat, currency, setProgress } = useContext(AppContext) as AppContextType

  const [isSendingAlert, setIsSendingAlert] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [selectedApptId, setSelectedApptId] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [alertForm, setAlertForm] = useState({ message: '', isCritical: false })
  const [vitals, setVitals] = useState({ bloodPressure: '', heartRate: '', temperature: '', notes: '' })
  const [medicines, setMedicines] = useState<Medicine[]>([{
    name: '',
    frequencyType: 'daily',
    frequencyValue: 0,
    dosagePerDay: 1,
    totalQuantity: 7,
    status: 'Active',
    remainingQuantity: 7,
    lastTaken: ''
  }])

  const handleSendAlert = async () => {
    if (!alertForm.message.trim()) {
      return toast.error("Please enter alert content");
    }

    try {
      setIsSendingAlert(true);
      setProgress(40);

      const { data } = await axiosInstance.post(API_PATHS.DOCTOR.SEND_ALERT,
        {
          appointmentId: selectedApptId,
          messageContent: alertForm.message,
          isCritical: alertForm.isCritical
        }
      );

      if (data.success) {
        toast.success("Alert processed successfully!");
        setShowAlertModal(false);
        setAlertForm({ message: '', isCritical: false });
        await getAppointments();
      } else {
        toast.error(data.message || "Failed to send alert");
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.success("Alert saved (Email may take a moment)");
        setShowAlertModal(false);
        setAlertForm({ message: '', isCritical: false });
        await getAppointments();
      } else {
        const msg = error.response?.data?.message || error.message || "An error occurred";
        toast.error(msg);
      }
    } finally {
      setIsSendingAlert(false);
      setProgress(100);
    }
  }

  const resetForm = () => {
    setVitals({ bloodPressure: '', heartRate: '', temperature: '', notes: '' })
    setMedicines([{ name: '', frequencyType: 'daily', frequencyValue: 0, dosagePerDay: 1, totalQuantity: 7, status: 'Active', remainingQuantity: 7, lastTaken: '' }])
    setShowModal(false)
    setSelectedApptId('')
  }

  const getAdherenceStats = (med: any) => {
    if (!med.totalQuantity) return { rate: 0 };
    const actual = med.totalQuantity - med.remainingQuantity;
    const rate = Math.min(100, Math.round((actual / med.totalQuantity) * 100));
    return { rate };
  }
  useEffect(() => {
    if (dToken) {
      setProgress(30);
      getAppointments().finally(() => setProgress(100));
    }
  }, [dToken])

  return {
    appointments, setExpandedId, expandedId, calculateAge,
    currency, slotDateFormat, setProgress, cancelAppointment,
    setSelectedApptId, setShowModal, setShowAlertModal, getAdherenceStats,
    alertForm, setAlertForm, showAlertModal, isSendingAlert, handleSendAlert,
    showModal, resetForm, vitals, setVitals, setMedicines, medicines, completeAppointment,
    getAppointments, selectedApptId
  }
}

export default useDoctorAppointment
