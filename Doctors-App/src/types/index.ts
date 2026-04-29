// src/types/index.ts

export interface PrescribedMedicine {
  name: string;
  dosagePerDay: number;
  frequencyType: 'daily' | 'interval';
  totalQuantity: number;
  remainingQuantity: number;
  lastTaken?: string;
}

export interface HealthData {
  heartRate: string;
  bloodPressure: string;
  temperature: string;
  prescribedMedicines: PrescribedMedicine[];
}

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
  slots_booked: Record<string, string[]>; // e.g., {"20-03-2026": ["10:00 AM"]}
}

export interface UserData {
  _id: string;
  name: string;
  email: string;
  image: string;
  phone: string;
  address: {
    line1: string;
    line2: string;
  };
  gender: 'Male' | 'Female' | 'Not Selected';
  dob: string;
}

export interface AppContextType {
  // Functions
  currency: string;
  currencySymbol: string;
  calculateAge: (dob: string) => number;
  slotDateFormat: (slotDate: string) => string;
  getDoctorsData: () => Promise<void>;
  loadUserProfileData: () => Promise<void>;
  updateDose: (
    appointmentId: string,
    medicineName: string,
    overdoseAlert?: boolean
  ) => Promise<boolean>;

  // State & Setters

  backendUrl: string;
  token: string;
  setToken: (token: string) => void;
  doctors: Doctor[];
  setDoctors: (doctors: Doctor[]) => void;
  userData: any;
  setUserData: React.Dispatch<React.SetStateAction<any>>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  progress: number;
  setProgress: (progress: number) => void;
}

export interface Appointment {
  _id: string;
  docId: string;
  userId: string;
  docData: Doctor; // This uses the Doctor interface we already made
  slotDate: string;
  slotTime: string;
  amount: number;
  date: number;
  cancelled: boolean;
  payment: boolean;
  isCompleted: boolean;
  isPaid: boolean;
  healthData?: HealthData;
  patientStatus?: 'Normal' | 'Critical';
  messages?: { content: string; sentAt: Date; isCritical: boolean }[];
}