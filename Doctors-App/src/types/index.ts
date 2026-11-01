export interface PrescribedMedicine {
  name: string;
  dosagePerDay: number;
  /** missing on prescriptions saved before it was stored; treat as daily */
  frequencyType?: "daily" | "interval";
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
  /** set when nobody turned up: by = who missed it */
  missed?: { by: "patient" | "doctor"; markedBy: "doctor" | "admin" | "system"; at: string };
  refund?: Refund;
  /** how it was paid (older paid appointments have none: card) */
  paymentMethod?: "stripe" | "wallet";
}

export type Refund = {
  percent: number;
  amount: number;
  /** refunded: sent back. manual/failed: the clinic is sending it by hand */
  status: "refunded" | "manual" | "failed";
  /** where it went back to */
  method?: "stripe" | "wallet";
  reason?: "missed" | "cancelled";
  at: string;
};

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
  /** Opens the Medications tab on this visit, optionally on one medicine. */
  openMedications: (appointmentId: string, medicine?: string) => void;
}

// --- wish well gifting (1 coin = 1 cent) ---

export type Gift = {
  id: string;
  name: string;
  emoji: string;
  coins: number;
  /** banner: shown on the Wish Well banner; fullscreen: also a full-screen animation */
  tier: "small" | "banner" | "fullscreen";
};

export type CoinPack = { id: string; coins: number; cents: number; bonus?: number };

export type WalletTransaction = {
  _id: string;
  kind:
    | "topup"
    | "gift_sent"
    | "gift_received"
    | "payout_requested"
    | "payout_returned"
    | "appointment_payment"
    | "appointment_refund";
  coins: number;
  cents: number;
  giftId?: string;
  counterpartyName?: string;
  note?: string;
  createdAt: string;
};

export type WalletOverview = {
  coins: number;
  fundCents: number;
  fundLifetimeCents: number;
  hasCareFund: boolean;
  pendingPayout: { _id: string; cents: number; bankName: string; createdAt: string } | null;
  transactions: WalletTransaction[];
  packs: CoinPack[];
  gifts: Gift[];
  feePercent: number;
  minPayoutCents: number;
  dailyGiftLimit: number;
};

/** A gift someone sent, as shown on banners and in the live celebration. */
export type GiftEvent = {
  _id?: string;
  gift?: Gift;
  fromName: string;
  toName: string;
  entryId: string;
  createdAt?: string;
};

// --- notifications (the bell) ---

export type AppNotification = {
  _id: string;
  title: string;
  message: string;
  type: "dose" | "appointment" | "alert" | "message" | "payment" | "care" | "general";
  /** page to open when it's tapped */
  link?: string;
  isRead: boolean;
  createdAt: string;
};

// --- doctor chat ---

export type ChatMessage = {
  _id: string;
  doctorId: string;
  userId: string;
  sender: "doctor" | "patient";
  text: string;
  urgent: boolean;
  appointmentId?: string;
  medicineName?: string;
  readAt: string | null;
  createdAt: string;
};

export type Conversation = {
  doctor: { _id: string; name: string; image: string; speciality: string };
  lastMessage: ChatMessage | null;
  unread: number;
  urgentUnread: number;
};

/** A visit with this doctor, offered as "what is this message about". */
export type ChatVisit = {
  _id: string;
  slotDate: string;
  slotTime: string;
  isCompleted: boolean;
  medicines: string[];
};

/** Router state the Medications tab understands, sent from the Appointments page. */
export type MedicationsFocus = { visitId: string; medicine?: string };

export interface VitalsProps {
  latestAppointment: Appointment | null;
}

export interface DoctorsCardGridProps {
  filteredDoctors: Doctor[];
  handleClearFilters: () => void;
}
