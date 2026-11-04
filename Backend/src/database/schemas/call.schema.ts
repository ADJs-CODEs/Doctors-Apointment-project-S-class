import { Schema, type Document } from 'mongoose';

/**
 * A voice or video call between a doctor and a patient, rung inside the app.
 * Doctors can call their own patients any time (free); patients can call their doctor only
 * during a paid video visit's window. `open` is set while it's ringing or active, and two
 * unique indexes mean nobody can be in two calls at once.
 */
export type CallKind = 'voice' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed' | 'cancelled';

export interface ICall extends Document {
  doctorId: string;
  patientId: string;
  doctorName: string;
  patientName: string;
  doctorImage?: string;
  patientImage?: string;
  kind: CallKind;
  startedBy: 'doctor' | 'patient';
  /** the paid visit it belongs to, when there is one */
  appointmentId?: string;
  status: CallStatus;
  open?: boolean;
  provider: 'daily' | 'jitsi';
  room: string;
  url: string;
  ringUntil: Date;
  answeredAt?: Date;
  endedAt?: Date;
  endedBy?: 'doctor' | 'patient' | 'system';
  createdAt: Date;
}

export const CallSchema = new Schema<ICall>(
  {
    doctorId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    doctorName: { type: String, required: true },
    patientName: { type: String, required: true },
    doctorImage: String,
    patientImage: String,
    kind: { type: String, enum: ['voice', 'video'], required: true },
    startedBy: { type: String, enum: ['doctor', 'patient'], required: true },
    appointmentId: String,
    status: { type: String, enum: ['ringing', 'active', 'ended', 'declined', 'missed', 'cancelled'], default: 'ringing' },
    open: { type: Boolean },
    provider: { type: String, enum: ['daily', 'jitsi'], required: true },
    room: { type: String, required: true },
    url: { type: String, required: true },
    ringUntil: { type: Date, required: true },
    answeredAt: Date,
    endedAt: Date,
    endedBy: { type: String, enum: ['doctor', 'patient', 'system'] },
  },
  { timestamps: true },
);
CallSchema.index({ doctorId: 1 }, { unique: true, partialFilterExpression: { open: true }, name: 'one_open_call_per_doctor' });
CallSchema.index({ patientId: 1 }, { unique: true, partialFilterExpression: { open: true }, name: 'one_open_call_per_patient' });
