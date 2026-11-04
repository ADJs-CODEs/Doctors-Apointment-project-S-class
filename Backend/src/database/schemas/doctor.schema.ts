import { Schema, type Document } from 'mongoose';

export interface IDoctor extends Document {
  name: string;
  email: string;
  password: string;
  image: string;
  speciality: string;
  degree: string;
  experience: string;
  about: string;
  available: boolean;
  fees: number;
  address: { line1: string; line2: string };
  date: number;
  // date key (e.g. "21_3_2026") -> booked times on that day
  slots_booked: Record<string, string[]>;
  /** where the clinic is, looked up once from the address (maps/maps.service.ts) */
  geo?: { lat: number; lng: number; address: string; source: 'google' | 'osm'; at: Date };
  /** fee for a video consultation; unset = the doctor doesn't offer video calls */
  videoFees?: number;
  /** when the doctor can be booked (appointments/availability.ts); unset = the old 10am–9pm daily */
  availability?: Availability;
  /** the doctor's own choices (settings/doctor-preferences.ts); private, never copied to appointments */
  settings?: DoctorSettings;
  /** Google Calendar connection; the refresh token is encrypted and never returned */
  googleCalendar?: { email?: string; refreshToken?: string; connectedAt?: Date; lastError?: string };
  /** where withdrawals go (the account name comes from the bank when Paystack is on) */
  payoutBank?: { bankName: string; bankCode?: string; accountNumber: string; accountName: string; verified: boolean };
}

export type DoctorEmail = 'bookings' | 'cancellations' | 'visitStarting';

export type DoctorSettings = {
  /** which (non-safety) emails they get; safety alerts are always sent */
  emails: Record<DoctorEmail, boolean>;
  /** no non-urgent emails between these clinic-time hours (the bell still gets everything) */
  quietHours: { enabled: boolean; start: string; end: string };
};

export type VisitKind = 'in-person' | 'video';

export type Availability = {
  slotMinutes: 15 | 30 | 45 | 60;
  /** day: 0 = Sunday … 6 = Saturday; times are the clinic's local time, "HH:MM" */
  weekly: { day: number; start: string; end: string; kinds: VisitKind[] }[];
  /** dates off, "YYYY-MM-DD" */
  daysOff: string[];
};

export const DoctorSchema = new Schema<IDoctor>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true },
    fees: { type: Number, required: true },
    address: { type: Object, required: true },
    date: { type: Number, required: true },
    slots_booked: { type: Object, default: {} },
    geo: { type: Object },
    videoFees: { type: Number, min: 0 },
    availability: { type: Object },
    settings: { type: Object },
    googleCalendar: {
      email: { type: String },
      // never returned by queries unless asked for with '+googleCalendar.refreshToken'
      refreshToken: { type: String, select: false },
      connectedAt: { type: Date },
      lastError: { type: String },
    },
    payoutBank: { type: Object },
  },
  // keep empty slots_booked objects instead of letting mongoose strip them
  { minimize: false },
);
