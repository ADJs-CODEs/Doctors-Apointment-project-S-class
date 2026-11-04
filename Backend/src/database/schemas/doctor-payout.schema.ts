import { Schema, type Document, type Types } from 'mongoose';

/**
 * A doctor withdrawing their earnings (settled visits minus the clinic's commission). Like
 * pharmacy withdrawals, the balance is never stored: it's always earned minus withdrawals
 * that aren't rejected/failed. `open` is set while one is pending or being sent, and a
 * unique index allows only one open withdrawal per doctor.
 */
export type DoctorPayoutStatus = 'pending' | 'processing' | 'paid' | 'rejected' | 'failed';

export interface IDoctorPayout extends Document {
  docId: Types.ObjectId | string;
  doctorName: string;
  cents: number;
  bank: { bankName: string; bankCode?: string; accountNumber: string; accountName: string; verified: boolean };
  status: DoctorPayoutStatus;
  open?: boolean;
  provider?: 'manual' | 'paystack';
  /** what Paystack sends (kobo), from the USD amount */
  payoutMinor?: number;
  transferCode?: string;
  reference?: string;
  failureReason?: string;
  adminNote?: string;
  decidedAt?: Date;
  createdAt: Date;
}

export const DoctorPayoutSchema = new Schema<IDoctorPayout>(
  {
    docId: { type: Schema.Types.ObjectId, ref: 'doctor', required: true, index: true },
    doctorName: { type: String, required: true },
    cents: { type: Number, required: true, min: 1 },
    bank: {
      bankName: { type: String, required: true },
      bankCode: String,
      accountNumber: { type: String, required: true },
      accountName: { type: String, required: true },
      verified: { type: Boolean, default: false },
    },
    status: { type: String, enum: ['pending', 'processing', 'paid', 'rejected', 'failed'], default: 'pending', index: true },
    open: { type: Boolean },
    provider: { type: String, enum: ['manual', 'paystack'] },
    payoutMinor: Number,
    transferCode: String,
    reference: { type: String, maxlength: 120 },
    failureReason: { type: String, maxlength: 300 },
    adminNote: { type: String, maxlength: 500 },
    decidedAt: Date,
  },
  { timestamps: true },
);
DoctorPayoutSchema.index({ docId: 1 }, { unique: true, partialFilterExpression: { open: true }, name: 'one_open_payout_per_doctor' });

/** Clinic-wide settings the admin changes from the panel (one document per key). */
export interface IPlatformSetting extends Document {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export const PlatformSettingSchema = new Schema<IPlatformSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);
