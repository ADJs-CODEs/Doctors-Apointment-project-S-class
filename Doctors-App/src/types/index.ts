export interface PrescribedMedicine {
  name: string;
  dosagePerDay: number;
  frequencyType: "daily" | "interval";
  totalQuantity: number;
  remainingQuantity: number;
  lastTaken?: string;
  overdoseAlert?: boolean;
  adherenceLogs?: Date[];
  status?: "Active" | "Completed";
}

export interface HealthData {
  heartRate: string;
  bloodPressure: string;
  temperature: string;
  doctorNotes?: string;
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
  address: { line1: string; line2: string };
  slots_booked: Record<string, string[]>;
}

export interface UserData {
  _id: string;
  name: string;
  email: string;
  image: string;
  phone: string;
  address: { line1: string; line2: string };
  gender: "Male" | "Female" | "Not Selected";
  dob: string;
}

export interface AppContextType {
  currency: string;
  currencySymbol: string;
  calculateAge: (dob: string) => number;
  slotDateFormat: (slotDate: string) => string;
  getDoctorsData: () => Promise<void>;
  loadUserProfileData: () => Promise<void>;
  updateDose: (
    appointmentId: string,
    medicineName: string,
    overdoseAlert?: boolean,
  ) => Promise<boolean>;
  backendUrl?: string;
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
  docData: Doctor;
  userData?: any;
  slotDate: string;
  slotTime: string;
  amount: number;
  date: number;
  cancelled: boolean;
  payment: boolean;
  isCompleted: boolean;
  isPaid?: boolean;
  healthData?: HealthData;
  patientStatus?: "Normal" | "Stable" | "Critical";
  messages?: { content: string; sentAt: Date; isCritical: boolean }[];
}

export interface MyAppointmentCardProps {
  item: Appointment;
  isCritical: boolean;
  cancelAppointment: (id: string) => void;
  payStripe: (id: string) => void;
  onViewReport: (id: string) => void;
  isExpanded: boolean;
  toggleTracker: (id: string) => void;
}

export interface HealthDropdownProps {
  item: Appointment;
  isCritical: boolean;
  latestMessage:
    | { content: string; sentAt: Date; isCritical: boolean }
    | null
    | undefined;
  logDose: (
    appointmentId: string,
    medicineName: string,
    med: PrescribedMedicine,
  ) => Promise<void>;
  processingMed: string | null;
}

export interface VitalsProps {
  latestAppointment: Appointment | null;
}

export interface DoctorsCardGridProps {
  filteredDoctors: Doctor[];
  handleClearFilters: () => void;
}
