import axios from "axios";
import { createContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { AppContextType, Doctor } from "../types/index.js";

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppContextProviderProps {
  children: ReactNode;
}

const AppContextProvider = (props: AppContextProviderProps) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // --- State ---
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [userData, setUserData] = useState<any>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  const currency = '$';

  // --- Helpers ---
  const calculateAge = (dob: string): number => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const months: string[] = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

  const slotDateFormat = (slotDate: string): string => {
    if (!slotDate) return "";
    const dateArray = slotDate.split('_');
    return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2];
  };

  // --- API Actions ---

  // Fetch all doctors
  const getDoctorsData = async () => {
    try {
      setProgress(30);
      setLoading(true);
      const { data } = await axios.get(backendUrl + '/api/doctor/list');
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  // Fetch User Profile
  const loadUserProfileData = async () => {
    if (!token) return;
    try {
      setProgress(40);
      const { data } = await axios.get(backendUrl + '/api/user/get-profile', { headers: { token } });
      if (data.success) {
        setUserData(data.userData);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProgress(100);
    }
  };

  // Log Medication Dose (Supports Overdose Alert)
  const updateDose = async (appointmentId: string, medicineName: string, overdoseAlert: boolean = false) => {
    try {
      setProgress(40);
      const { data } = await axios.post(
        backendUrl + '/api/user/update-dose',
        { appointmentId, medicineName, overdoseAlert },
        { headers: { token } }
      )
      if (data.success) {
        toast.success(data.message);
        // We refresh profile data in case any user-level health stats changed
        loadUserProfileData();
        return true;
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
      return false;
    } finally {
      setProgress(100);
    }
  };

  // --- Effects ---

  // Initial Load
  useEffect(() => {
    getDoctorsData();
  }, []);

  // Sync token and load user data on login/logout
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      loadUserProfileData();
    } else {
      localStorage.removeItem('token');
      setUserData(false);
    }
  }, [token]);

  // --- Context Value ---
  const value: AppContextType = {
    calculateAge,
    slotDateFormat,
    currency,
    backendUrl,
    token,
    setToken,
    doctors,
    setDoctors,
    getDoctorsData,
    userData,
    setUserData,
    loadUserProfileData,
    loading,
    setLoading,
    progress,
    setProgress,
    updateDose
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;