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
  // the due time we last sent a reminder / missed-dose alert for, so each is sent once
  reminderSentFor?: Date;
  missedAlertFor?: Date;
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
  // appointment reminders already sent ('soon', 'now', 'ended'), so each goes out once
  remindersSent: string[];
  // Stripe payment, kept so a refund can be issued (only payments made after 2026-11-01)
  paymentIntentId?: string;
  /** how it was paid; older paid appointments have none (they were Stripe) */
  paymentMethod?: 'stripe' | 'wallet';
  /** for wallet payments: what came out of the care fund and out of coins, for refunds */
  walletPayment?: { fundCents: number; coins: number };
  // a no-show: who didn't turn up, and who/what recorded it
  missed?: { by: 'patient' | 'doctor'; markedBy: 'doctor' | 'admin' | 'system'; at: Date };
  refund?: IRefund;
}

export interface IRefund {
  percent: number;
  /** in the appointment's currency, e.g. 25 for half of 50 */
  amount: number;
  // refunded: sent (through Stripe, or straight back into the wallet). manual: no Stripe
  // reference (older payment), admin must refund by hand. failed: Stripe refused; error says why.
  status: 'refunded' | 'manual' | 'failed';
  /** where the money went back to */
  method?: 'stripe' | 'wallet';
  /** why: a missed appointment or a cancellation */
  reason?: 'missed' | 'cancelled';
  stripeRefundId?: string;
  error?: string;
  at: Date;
}

/** Share of the fee refunded when an appointment is missed. */
export const REFUND_PERCENT = { patient: 50, doctor: 100 } as const;

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
    remindersSent: { type: [String], default: undefined },
    paymentIntentId: { type: String },
    paymentMethod: { type: String, enum: ['stripe', 'wallet'] },
    walletPayment: {
      type: new Schema({ fundCents: { type: Number }, coins: { type: Number } }, { _id: false }),
      default: undefined,
    },
    missed: {
      type: new Schema(
        {
          by: { type: String, enum: ['patient', 'doctor'], required: true },
          markedBy: { type: String, enum: ['doctor', 'admin', 'system'], required: true },
          at: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
    refund: {
      type: new Schema(
        {
          percent: { type: Number, required: true },
          amount: { type: Number, required: true },
          status: { type: String, enum: ['refunded', 'manual', 'failed'], required: true },
          method: { type: String, enum: ['stripe', 'wallet'] },
          reason: { type: String, enum: ['missed', 'cancelled'] },
          stripeRefundId: { type: String },
          error: { type: String },
          at: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
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
          reminderSentFor: { type: Date },
          missedAlertFor: { type: Date },
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
