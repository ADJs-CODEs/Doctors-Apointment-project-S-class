import axios from "axios";
import { createContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { AppContextType, Doctor, UserData } from "../types/index.js";

// Explicitly typing the Context
export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppContextProviderProps {
  children: ReactNode;
}

const AppContextProvider = (props: AppContextProviderProps) => {
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [userData, setUserData] = useState<any>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  const currencySymbol = '$';

  // Calculating age based on Date of Birth string (YYYY-MM-DD)
  const calculateAge = (dob: string): number => {
    const today = new Date();
    const birthDate = new Date(dob);

    let age = today.getFullYear() - birthDate.getFullYear();
    return age;
  };

  const months: string[] = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

  //Format for SlotDate
  const slotDateFormat = (slotDate: string): string => {
    if (!slotDate) return "";
    const dateArray = slotDate.split('_');
    return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2];
  };

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const getDoctorsData = async () => {
    try {
      // Start Progress Bar
      setProgress(30);
      //Open skelenton
      setLoading(true);
      const { data } = await axios.get(backendUrl + '/api/doctor/list');
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.log(error);
      toast.error(error.message);
    } finally {
      // Hide skeletons
      setLoading(false);
      //Finish Progress Bar
      setProgress(100);
    }
  };

  const loadUserProfileData = async () => {
    try {
      setProgress(40);
      const { data } = await axios.get(backendUrl + '/api/user/get-profile', { headers: { token } });
      if (data.success) {
        setUserData(data.userData);
        console.log(data.userData);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
    finally {
      // Finish Progress Bar
      setProgress(100);
    }
  };

  useEffect(() => {
    if (token) {
      loadUserProfileData();
    } else {
      setUserData(false);
    }
  }, [token]);


  useEffect(() => {
    getDoctorsData();
  }, []);

  const value: AppContextType = {
    calculateAge,
    slotDateFormat,
    currencySymbol, backendUrl,
    token, setToken,
    doctors, setDoctors,
    getDoctorsData,
    userData, setUserData,
    loadUserProfileData,
    loading, setLoading,
    progress, setProgress
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;