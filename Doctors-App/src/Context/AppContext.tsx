import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { AppContextType, Doctor } from "../types/index.js";
import { API_PATHS } from "../utils/apiPath.js";
import axiosInstance from "../utils/axiosInstance.js";

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppContextProviderProps {
  children: ReactNode;
}

const AppContextProvider = (props: AppContextProviderProps) => {
  const [token, setToken] = useState<string>(
    localStorage.getItem("token") || "",
  );
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [userData, setUserData] = useState<any>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  const currency = "$";
  const currencySymbol = "$";

  const calculateAge = (dob: string): number => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const months = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "July",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ];

  const slotDateFormat = (slotDate: string): string => {
    if (!slotDate) return "";
    const dateArray = slotDate.split("_");
    return `${dateArray[0]} ${months[Number(dateArray[1])]} ${dateArray[2]}`;
  };

  // getDoctorsData: retries up to 3 times with backoff on failure
  const getDoctorsData = useCallback(async (attempt = 1): Promise<void> => {
    try {
      setLoading(true);
      setProgress(30);
      const { data } = await axiosInstance.get(API_PATHS.USER.GET_DOCTORS_DATA);
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      if (attempt < 3) {
        // Exponential backoff: 2s, 4s
        await new Promise((res) => setTimeout(res, attempt * 2000));
        return getDoctorsData(attempt + 1);
      }
      // After 3 attempts, show error but don't leave loading spinner stuck
      toast.error("Could not load doctors. Please refresh.");
      setDoctors([]);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, []);

  const loadUserProfileData = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      setProgress(40);
      const { data } = await axiosInstance.get(
        API_PATHS.AUTH.LOAD_USER_PROFILE_DATA,
      );
      if (data.success) {
        setUserData(data.userData);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      // Silent fail on profile — don't block the app
      console.warn("Profile load failed:", error.message);
    } finally {
      setProgress(100);
    }
  }, [token]);

  const updateDose = async (
    appointmentId: string,
    medicineName: string,
    overdoseAlert = false,
  ): Promise<boolean> => {
    try {
      setProgress(40);
      const { data } = await axiosInstance.post(API_PATHS.USER.UPDATE_DOSE, {
        appointmentId,
        medicineName,
        overdoseAlert,
      });
      if (data.success) {
        toast.success(data.message);
        loadUserProfileData();
        return true;
      }
      toast.error(data.message);
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
      return false;
    } finally {
      setProgress(100);
    }
  };

  // Initial load
  useEffect(() => {
    getDoctorsData();
  }, []);

  // Sync token
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      loadUserProfileData();
    } else {
      localStorage.removeItem("token");
      setUserData(false);
    }
  }, [token]);

  const value: AppContextType = {
    calculateAge,
    slotDateFormat,
    currency,
    currencySymbol,
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
    updateDose,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
