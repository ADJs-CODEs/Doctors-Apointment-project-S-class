import type { Dispatch, SetStateAction, ReactNode } from "react";

// --- Base Data Models ---
export interface Doctor {
  _id: string;
  name: string;
  image: string;
  speciality: string;
  degree: string;
  experience: string;
  about: string;
  available: boolean;
  fees: number;
  address: {
    line1: string;
    line2: string;
  };
  date: number;
  slots_booked?: Record<string, string[]>;
}

export interface Appointment {
  _id: string;
  userId: string;
  docId: string;
  slotDate: string;
  slotTime: string;
  userData: {
    name: string;
    image: string;
    dob: string;
  };
  docData: {
    name: string;
    image: string;
  };
  amount: number;
  cancelled: boolean;
  payment: boolean;
  isCompleted: boolean;
}

// --- Context Specific Types ---
export interface AdminContextType {
  aToken: string;
  setAToken: Dispatch<SetStateAction<string>>;
  backendUrl: string;
  doctors: Doctor[];
  getAllDoctors: () => Promise<void>;
  changeAvailability: (docId: string) => Promise<void>;
  appointments: Appointment[];
  setAppointments: Dispatch<SetStateAction<Appointment[]>>;
  getAllAppointments: () => Promise<void>;
  cancelAppointment: (appointmentId: string) => Promise<void>;
  dashData: any;
  getDashData: () => Promise<void>;
}

export interface DoctorContextType {
  dToken: string;
  setDToken: Dispatch<SetStateAction<string>>;
  backendUrl: string;
  appointments: Appointment[];
  setAppointments: Dispatch<SetStateAction<Appointment[]>>;
  getAppointments: () => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  completeAppointment: (id: string) => Promise<void>;
  dashData: any;
  setDashData: Dispatch<SetStateAction<any>>;
  getDashData: () => Promise<void>;
  profileData: Doctor | false;
  setProfileData: Dispatch<SetStateAction<any>>;
  getProfileData: () => Promise<void>;
  updateProfile: (data: any) => Promise<boolean>;
}

export interface AppContextType {
  calculateAge: (dob: string) => number;
  slotDateFormat: (slotDate: string) => string;
  currency: string;
}

export interface ProviderProps {
  children: ReactNode;
}