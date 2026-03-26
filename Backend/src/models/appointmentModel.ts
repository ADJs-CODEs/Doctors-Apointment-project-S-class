import mongoose, { Document, Model, Schema } from 'mongoose'

interface IMessage {
  sender: 'Doctor' | 'System';
  content: string;
  sentAt: Date;
  isRead: boolean;
}

interface IMedicine {
  name: string;
  dosagePerDay: number;
  totalQuantity: number;
  remainingQuantity: number;
  lastTaken?: Date;
  overdoseAlert: boolean;
  adherenceLogs: Date[];
  status: 'Active' | 'Completed';
}

interface IHealthData {
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
  userData: any;
  docData: any;
  amount: number;
  date: number;
  cancelled: boolean;
  payment: boolean;
  isCompleted: boolean;
  healthData: IHealthData;
  // --- NEW FIELDS ---
  patientStatus: 'Stable' | 'Critical' | 'Completed';
  messages: IMessage[];
  lastWarningSent?: Date;
}

const appointmentSchema: Schema<IAppointment> = new mongoose.Schema({
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

  // --- NEW LOGIC FIELDS ---
  patientStatus: {
    type: String,
    enum: ['Stable', 'Critical', 'Completed'],
    default: 'Stable'
  },
  messages: [{
    sender: { type: String, enum: ['Doctor', 'System'], default: 'Doctor' },
    content: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
  }],
  lastWarningSent: { type: Date },

  healthData: {
    bloodPressure: { type: String, default: "" },
    heartRate: { type: String, default: "" },
    temperature: { type: String, default: "" },
    prescribedMedicines: [{
      name: { type: String, required: true },
      dosagePerDay: { type: Number, required: true },
      totalQuantity: { type: Number, required: true },
      remainingQuantity: { type: Number, required: true },
      lastTaken: { type: Date },
      overdoseAlert: { type: Boolean, default: false },
      adherenceLogs: [{ type: Date }],
      status: { type: String, enum: ['Active', 'Completed'], default: 'Active' }
    }],
    doctorNotes: { type: String, default: "" }
  }
}, { minimize: false, timestamps: true }) // Added timestamps for better record keeping

const appointmentModel: Model<IAppointment> = mongoose.models.appointment || mongoose.model<IAppointment>('appointment', appointmentSchema)

export default appointmentModel