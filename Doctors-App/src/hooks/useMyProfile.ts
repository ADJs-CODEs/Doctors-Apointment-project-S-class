import React, { useContext, useState } from 'react'
import type { AppContextType, Appointment } from "../types/index.js"
import axiosInstance from '../utils/axiosInstance.js'
import { API_PATHS } from '../utils/apiPath.js'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../Context/AppContext.js'
const useMyProfile = () => {
  const context = useContext(AppContext) as AppContextType;
  const { userData, setUserData, token, loadUserProfileData, setProgress } = context;
  const navigate = useNavigate();

  const [isEdit, setIsEdit] = useState<boolean>(false)
  const [image, setImage] = useState<File | false | undefined>(false)
  const [latestAppointment, setLatestAppointment] = useState<Appointment | null>(null)

  const getLatestHealthData = async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.USER.FETCH_APPOINTMENT)
      if (data.success && data.appointments.length > 0) {
        const completedWithData = data.appointments
          .reverse()
          .find((app: Appointment) => app.isCompleted && app.healthData);
        setLatestAppointment(completedWithData || null);
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
    navigate
  }
}

export default useMyProfile
