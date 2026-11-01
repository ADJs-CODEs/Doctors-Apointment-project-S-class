"use client";

import React, { useContext, useState } from 'react'
import type { AppContextType, Appointment } from "../types/index"
import axiosInstance from '../utils/axiosInstance'
import { API_PATHS } from '../utils/apiPath'
import { useNavigate } from "@/lib/navigation"
import { AppContext } from '../Context/AppContext'
import { activeMedicines, latestRecordedVisit, type ActiveMedicine } from '../utils/patientRecords'

const useMyProfile = () => {
  const context = useContext(AppContext) as AppContextType;
  const { userData, setUserData, token, loadUserProfileData, setProgress } = context;
  const navigate = useNavigate();

  const [isEdit, setIsEdit] = useState<boolean>(false)
  const [image, setImage] = useState<File | false | undefined>(false)
  const [latestAppointment, setLatestAppointment] = useState<Appointment | null>(null)
  const [medicines, setMedicines] = useState<ActiveMedicine[]>([])

  const getLatestHealthData = async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.USER.FETCH_APPOINTMENT)
      if (data.success) {
        // newest visit where the doctor actually recorded vitals or notes
        setLatestAppointment(latestRecordedVisit(data.appointments))
        setMedicines(activeMedicines(data.appointments))
      }
    } catch (error: any) {
      console.error("Error fetching vitals:", error.message)
    }
  }
  return {
    getLatestHealthData,
    userData,
    setUserData,
    token,
    loadUserProfileData,
    setProgress,
    image,
    setImage,
    setIsEdit,
    isEdit,
    latestAppointment,
    medicines,
    navigate
  }
}

export default useMyProfile
