import { createContext, useState, useCallback } from "react";
import type { ReactNode } from "react"
import { toast } from 'sonner';
import type { AdminContextType, Doctor, Appointment } from "../types/index.js";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";

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

  // Get All Doctors
  const getAllDoctors = useCallback(async () => {
    try {
      const { data } = await axiosInstance.post(API_PATHS.ADMIN.GET_ALL_DOCTORS);
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to fetch doctors";
      toast.error(msg);
    }
  }, [aToken, backendUrl]);

  //  Change Availability
  const changeAvailability = useCallback(async (docId: string) => {
    try {
      const { data } = await axiosInstance.post(API_PATHS.ADMIN.CHANGE_AVAILABILITY, { docId });
      if (data.success) {
        toast.success(data.message);

        // Awaiting state to refresh
        await getAllDoctors();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error updating availability";
      toast.error(msg);
    }
  }, [aToken, backendUrl, getAllDoctors]);

  // Get All Appointment
  const getAllAppointments = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.GET_ALL_APPOINTMENT);
      if (data.success) {
        setAppointments(data.appointments);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch appointments");
    }
  }, [aToken, backendUrl]);

  // Get Dashdata
  const getDashData = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.GET_DASH_DATA);
      if (data.success) {
        setDashData(data.dashData);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Dashboard error");
    }
  }, [aToken, backendUrl]);

  //Cancel Appointment
  const cancelAppointment = useCallback(async (appointmentId: string) => {
    try {
      const { data } = await axiosInstance.post(API_PATHS.ADMIN.CANCEL_APPOINTMENT, { appointmentId });
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

  //Delete Doctor
  const deleteDoctor = async (docId: string): Promise<void> => {
    try {
      const { data } = await axiosInstance.post(API_PATHS.ADMIN.DELETE_DOCTOR, { docId });

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
