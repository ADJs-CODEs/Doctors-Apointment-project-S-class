import { createContext, useState, useCallback } from "react";
import type { ReactNode } from "react"
import axios from 'axios';
import { toast } from 'sonner';
import type { AdminContextType, Doctor, Appointment } from "../types/index.js";

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminContextProviderProps {
  children: ReactNode;
}

const AdminContextProvider = ({ children }: AdminContextProviderProps) => {
  const [aToken, setAToken] = useState<string>(localStorage.getItem('aToken') || '');
  const [dashData, setDashData] = useState<any>(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // 1. Stable Get All Doctors
  const getAllDoctors = useCallback(async () => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/all-doctors', {}, { headers: { aToken } });
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      // 🛡️ Guard against showing technical JS errors in the toast
      const msg = error.response?.data?.message || "Failed to fetch doctors";
      toast.error(msg);
    }
  }, [aToken, backendUrl]);

  // 2. Stable Change Availability
  const changeAvailability = useCallback(async (docId: string) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/change-availability', { docId }, { headers: { aToken } });
      if (data.success) {
        toast.success(data.message);
        // We wait for the state to refresh
        await getAllDoctors();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error updating availability";
      toast.error(msg);
    }
  }, [aToken, backendUrl, getAllDoctors]);

  const getAllAppointments = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/appointments', { headers: { aToken } });
      if (data.success) {
        setAppointments(data.appointments);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch appointments");
    }
  }, [aToken, backendUrl]);

  const getDashData = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/dashboard', { headers: { aToken } });
      if (data.success) {
        setDashData(data.dashData);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Dashboard error");
    }
  }, [aToken, backendUrl]);

  const cancelAppointment = useCallback(async (appointmentId: string) => {
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
      toast.error(error.response?.data?.message || "Cancellation failed");
    }
  }, [aToken, backendUrl, getAllAppointments, getDashData]);

  const deleteDoctor = async (docId: string): Promise<void> => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/delete-doctor`,
        { docId },
        { headers: { aToken } }
      );

      if (data.success) {
        toast.success(data.message);
        await getAllDoctors(); // Refresh the list
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const value: AdminContextType = {
    aToken, setAToken,
    backendUrl, doctors,
    getAllDoctors, changeAvailability,
    appointments,
    getAllAppointments, cancelAppointment,
    dashData, getDashData, setAppointments,
    deleteDoctor
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;
