import { Schema, type Document } from 'mongoose';

export interface IMessage {
  sender: 'Doctor' | 'System';
  content: string;
  sentAt: Date;
  isRead: boolean;
}

export interface IMedicine {
  name: string;
  // 'daily': dosagePerDay doses spread over 24h. 'interval': one dose every dosagePerDay hours.
  frequencyType: 'daily' | 'interval';
  dosagePerDay: number;
  totalQuantity: number;
  remainingQuantity: number;
  lastTaken?: Date;
  overdoseAlert: boolean;
  adherenceLogs: Date[];
  status: 'Active' | 'Completed';
}

/** Hours between two doses of a medicine. */
export function hoursBetweenDoses(med: Pick<IMedicine, 'frequencyType' | 'dosagePerDay'>): number {
  const value = med.dosagePerDay > 0 ? med.dosagePerDay : 1;
  return med.frequencyType === 'interval' ? value : 24 / value;
}

export interface IHealthData {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  prescribedMedicines: IMedicine[];
  doctorNotes: string;
}

export interface IAppointment extends Document {
  userId: string;
  docId: string;
  slotDate: string;
  slotTime: string;
  // snapshots of the patient and doctor at booking time (denormalized on purpose)
  userData: any;
  docData: any;
  amount: number;
  date: number;
  cancelled: boolean;
  payment: boolean;
  isCompleted: boolean;
  healthData: IHealthData;
  patientStatus: 'Stable' | 'Critical' | 'Completed';
  messages: IMessage[];
  lastWarningSent?: Date;
}

export const AppointmentSchema = new Schema<IAppointment>(
  {
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    userData: { type: Object, required: true },
    docData: { type: Object, required: true },
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    patientStatus: {
      type: String,
      enum: ['Stable', 'Critical', 'Completed'],
      default: 'Stable',
    },
    messages: [
      {
        sender: { type: String, enum: ['Doctor', 'System'], default: 'Doctor' },
        content: { type: String, required: true },
        sentAt: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
      },
    ],
    lastWarningSent: { type: Date },
    healthData: {
      bloodPressure: { type: String, default: '' },
      heartRate: { type: String, default: '' },
      temperature: { type: String, default: '' },
      prescribedMedicines: [
        {
          _id: false,
          name: { type: String, required: true },
          // older prescriptions were saved without this; they were all treated as daily
          frequencyType: { type: String, enum: ['daily', 'interval'], default: 'daily' },
          dosagePerDay: { type: Number, required: true, default: 1 },
          totalQuantity: { type: Number, required: true },
          remainingQuantity: { type: Number, required: true },
          lastTaken: { type: Date },
          overdoseAlert: { type: Boolean, default: false },
          adherenceLogs: [{ type: Date }],
          status: { type: String, enum: ['Active', 'Completed'], default: 'Active' },
        },
      ],
      doctorNotes: { type: String, default: '' },
    },
  },
  { minimize: false, timestamps: true },
);
