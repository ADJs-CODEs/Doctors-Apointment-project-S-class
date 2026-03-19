import axios from "axios"
import { useState } from "react"
import { createContext } from "react"
import { toast } from "react-toastify"


export const DoctorContext = createContext()

const DoctorContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const [dToken, setDToken] = useState(localStorage.getItem('dtoken') || '')
  const [appointments, setAppointments] = useState([])
  const [dashData, setDashData] = useState(false)
  const [profileData, setProfileData] = useState(false)
  const getAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/doctor/appointments', { headers: { dtoken: dToken } })
      if (data.success) {
        setAppointments(data.appointments.reverse())
        console.log(data.appointments.reverse());

      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }

  }

  const completeAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/doctor/complete-appointment', { appointmentId }, { headers: { dtoken: dToken } })
      if (data.success) {
        toast.success(data.message)
        getAppointments()
      } else {
        toast.error(data.messge)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }
  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/doctor/cancel-appointment', { appointmentId }, { headers: { dtoken: dToken } })
      if (data.success) {
        toast.success(data.message)
        getAppointments()
      } else {
        toast.error(data.messge)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const getDashData = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/doctor/dashboard', { headers: { dtoken: dToken } })
      if (data.success) {
        setDashData(data.dashData)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const getProfileData = async () => {
    try {

      const { data } = await axios.get(backendUrl + '/api/doctor/profile', { headers: { dtoken: dToken } })
      if (data.success) {
        setProfileData(data.profileData)
        console.log(data.profileData)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const updateProfile = async (updateData) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/doctor/update-profile', updateData, { headers: { dtoken: dToken } })
      if (data.success) {
        toast.success(data.message)
        getProfileData() // Refresh data
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.message)
      return false
    }
  }


  const value = {
    dToken, setDToken, backendUrl,
    appointments, setAppointments, getAppointments,
    cancelAppointment, completeAppointment, dashData,
    setDashData, getDashData, profileData, setProfileData,
    getProfileData, updateProfile
  }

  return (
    <DoctorContext.Provider value={value}>
      {
        props.children
      }
    </DoctorContext.Provider>
  )
}

export default DoctorContextProvider