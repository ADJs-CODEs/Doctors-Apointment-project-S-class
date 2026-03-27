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

// Added Health Data and Status to match your backend model
export interface Medicine {
  name: string;
  dosagePerDay: number;
  frequencyType?: string;
  frequencyValue: number;
  note?: string;
  totalQuantity: number;
  remainingQuantity: number;
  status: 'Active' | 'Completed';
  lastTaken?: Date;
  overdoseAlert?: boolean;
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
    email?: string; // Helpful for alerts
  };
  docData: {
    name: string;
    speciality: string;
    image: string;
    email?: string;
  };
  amount: number;
  cancelled: boolean;
  payment: boolean;
  isCompleted: boolean;
  // --- NEW FIELDS SYNCED WITH BACKEND ---
  patientStatus?: 'Stable' | 'Critical' | 'Completed';
  healthData?: {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    doctorNotes: string;
    prescribedMedicines: Medicine[];
  };
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
  deleteDoctor: (docId: string) => Promise<void>;
}

export interface DoctorContextType {
  dToken: string;
  setDToken: Dispatch<SetStateAction<string>>;
  backendUrl: string;
  appointments: Appointment[];
  setAppointments: Dispatch<SetStateAction<Appointment[]>>;
  getAppointments: () => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  // FIXED: Changed from Promise<void> to Promise<boolean>
  completeAppointment: (appointmentId: string, healthData: any) => Promise<boolean>;
  dashData: any;
  setDashData: Dispatch<SetStateAction<any>>;
  getDashData: () => Promise<void>;
  profileData: Doctor | false;
  setProfileData: Dispatch<SetStateAction<any>>;
  getProfileData: () => Promise<void>;
  updateProfile: (data: any) => Promise<boolean>;
  sendAlert: (appointmentId: string, messageContent: string, isCritical: boolean) => Promise<boolean>;
}

export interface AppContextType {
  calculateAge: (dob: string) => number;
  slotDateFormat: (slotDate: string) => string;
  currency: string;
  backendUrl: string; // Added this as it is used in your components
}

export interface ProviderProps {
  children: ReactNode;
}