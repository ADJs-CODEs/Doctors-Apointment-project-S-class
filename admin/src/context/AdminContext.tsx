import { createContext, useState, } from "react";
import type { ReactNode } from "react"
import axios from 'axios';
import { toast } from 'sonner';
import type { AdminContextType, Doctor, Appointment } from "../types/index.js";

// 1. Create the Context with the Interface we defined in types/index.ts
export const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminContextProviderProps {
  children: ReactNode;
}

const AdminContextProvider = ({ children }: AdminContextProviderProps) => {

  const [aToken, setAToken] = useState<string>(localStorage.getItem('aToken') || '');
  const [dashData, setDashData] = useState<any>(false); // 'any' is okay here until we define the dash structure
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const getAllDoctors = async () => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/all-doctors', {}, { headers: { aToken } });
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const changeAvailability = async (docId: string) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/change-availability', { docId }, { headers: { aToken } });
      if (data.success) {
        toast.success(data.message);
        getAllDoctors();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getAllAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/appointments', { headers: { aToken } });
      if (data.success) {
        setAppointments(data.appointments);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/cancel-appointment', { appointmentId }, { headers: { aToken } });
      if (data.success) {
        toast.success(data.message);
        getAllAppointments();
        getDashData();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getDashData = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/dashboard', { headers: { aToken } });
      if (data.success) {
        setDashData(data.dashData);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const value: AdminContextType = {
    aToken, setAToken,
    backendUrl, doctors,
    getAllDoctors, changeAvailability,
    appointments,
    getAllAppointments, cancelAppointment,
    dashData, getDashData, setAppointments
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;