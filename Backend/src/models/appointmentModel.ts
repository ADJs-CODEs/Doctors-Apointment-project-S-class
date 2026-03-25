import mongoose, { Document, Model, Schema } from 'mongoose'

// 1. Define sub-interfaces for better organization
interface IMedicine {
  name: string;
  dosagePerDay: number;
  totalQuantity: number;
  remainingQuantity: number;
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

// 2. Update the main Interface
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
  // 🔑 Add this line to fix the error:
  healthData: IHealthData;
}

// 3. The Schema remains the same as you wrote it
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
  healthData: {
    bloodPressure: { type: String, default: "" },
    heartRate: { type: String, default: "" },
    temperature: { type: String, default: "" },
    prescribedMedicines: [{
      name: { type: String, required: true },
      dosagePerDay: { type: Number, required: true },
      totalQuantity: { type: Number, required: true },
      remainingQuantity: { type: Number, required: true },
      adherenceLogs: [{ type: Date }],
      status: { type: String, enum: ['Active', 'Completed'], default: 'Active' }
    }],
    doctorNotes: { type: String, default: "" }
  }
})

const appointmentModel: Model<IAppointment> = mongoose.models.appointment || mongoose.model<IAppointment>('appointment', appointmentSchema)

export default appointmentModel