import mongoose, { Document, Model, Schema } from 'mongoose'

// 1. Define an Interface representing the document in MongoDB
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
})

const appointmentModel: Model<IAppointment> = mongoose.models.appointment || mongoose.model<IAppointment>('appointment', appointmentSchema)

export default appointmentModel
