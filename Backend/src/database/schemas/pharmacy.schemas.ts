import { Schema, type Document, type Types } from 'mongoose';

// The medicine shop: certified pharmacies sell and deliver to patients. Each pharmacy is a
// business (this file's Pharmacy) run by personnel who log in to the doctor/admin panel
// (PharmacyStaff). The clinic's own pharmacy is just one of them, flagged operatedByClinic.

export type PharmacyStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface IPharmacy extends Document {
  name: string;
  /** Pharmacy premises licence number (e.g. PCN registration), checked by the admin */
  licenseNumber: string;
  email: string;
  phone: string;
  address: { line1: string; line2?: string };
  /** GeoJSON point [lng, lat]: lets the shop ask for pharmacies near a patient, nearest first */
  location?: { type: 'Point'; coordinates: [number, number] };
  /** how far they deliver, and what they charge for it (in cents, like everything else) */
  deliveryRadiusKm: number;
  deliveryFeeCents: number;
  status: PharmacyStatus;
  /** the clinic's own pharmacy: no commission is taken */
  operatedByClinic: boolean;
  /** why it was rejected/suspended, shown to the pharmacy */
  statusNote?: string;
  approvedAt?: Date;
  /** where withdrawals go (owner sets it; the account name comes from the bank when Paystack is on) */
  payoutBank?: { bankName: string; bankCode?: string; accountNumber: string; accountName: string; verified: boolean };
  createdAt: Date;
}

export const PharmacySchema = new Schema<IPharmacy>(
  {
    name: { type: String, required: true, maxlength: 120 },
    licenseNumber: { type: String, required: true, maxlength: 60 },
    email: { type: String, required: true, lowercase: true, maxlength: 160 },
    phone: { type: String, required: true, maxlength: 30 },
    address: {
      line1: { type: String, required: true, maxlength: 200 },
      line2: { type: String, maxlength: 200 },
    },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined }, // no empty point: the map index rejects it
    },
    deliveryRadiusKm: { type: Number, default: 10, min: 1, max: 100 },
    deliveryFeeCents: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true },
    operatedByClinic: { type: Boolean, default: false },
    statusNote: { type: String, maxlength: 500 },
    approvedAt: { type: Date },
    payoutBank: {
      type: new Schema(
        { bankName: String, bankCode: String, accountNumber: String, accountName: String, verified: Boolean },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { timestamps: true },
);
PharmacySchema.index({ location: '2dsphere' });

export type StaffRole = 'owner' | 'pharmacist' | 'staff';

/**
 * Someone who works for a pharmacy. Roles:
 *  - owner: everything, incl. staff, delivery settings and (later) payouts
 *  - pharmacist: can approve prescription-only orders; their licence is recorded
 *  - staff: products, stock, packing and delivery updates
 */
export interface IPharmacyStaff extends Document {
  pharmacyId: Types.ObjectId | string;
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  /** a pharmacist's own practising licence number */
  pharmacistLicense?: string;
  active: boolean;
  /** set when someone else picked the password; they're asked to change it */
  mustChangePassword: boolean;
  createdAt: Date;
}

export const PharmacyStaffSchema = new Schema<IPharmacyStaff>(
  {
    pharmacyId: { type: Schema.Types.ObjectId, ref: 'pharmacy', required: true, index: true },
    name: { type: String, required: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['owner', 'pharmacist', 'staff'], required: true },
    pharmacistLicense: { type: String, maxlength: 60 },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/** Shop sections. Pharmacies pick one per product; patients filter by them. */
export const PRODUCT_CATEGORIES = [
  { id: 'pain', label: 'Pain & fever' },
  { id: 'cold-flu', label: 'Cold, cough & flu' },
  { id: 'allergy', label: 'Allergy' },
  { id: 'digestive', label: 'Stomach & digestion' },
  { id: 'antibiotics', label: 'Antibiotics & anti-infectives' },
  { id: 'chronic', label: 'Blood pressure, diabetes & heart' },
  { id: 'vitamins', label: 'Vitamins & supplements' },
  { id: 'skin', label: 'Skin care' },
  { id: 'first-aid', label: 'First aid' },
  { id: 'mother-baby', label: 'Mother & baby' },
  { id: 'devices', label: 'Health devices' },
  { id: 'other', label: 'Other' },
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]['id'];

/**
 * Something a pharmacy sells. Prices are in cents like the rest of the app. A product
 * marked requiresPrescription can only be ordered against a prescription one of our
 * doctors wrote, and a pharmacist approves the order (step 3).
 */
export interface IProduct extends Document {
  pharmacyId: Types.ObjectId | string;
  name: string;
  /** active ingredient, e.g. "Paracetamol" for "Panadol Extra" (helps search + prescription matching) */
  genericName?: string;
  /** e.g. "500 mg tablets" */
  strength?: string;
  /** e.g. "Pack of 24" */
  packSize?: string;
  category: ProductCategory;
  description?: string;
  priceCents: number;
  stock: number;
  requiresPrescription: boolean;
  image?: string;
  /** hidden from the shop without deleting it (past orders still point at it) */
  listed: boolean;
  createdAt: Date;
}

export const ProductSchema = new Schema<IProduct>(
  {
    pharmacyId: { type: Schema.Types.ObjectId, ref: 'pharmacy', required: true, index: true },
    name: { type: String, required: true, maxlength: 120 },
    genericName: { type: String, maxlength: 120 },
    strength: { type: String, maxlength: 60 },
    packSize: { type: String, maxlength: 60 },
    category: { type: String, enum: PRODUCT_CATEGORIES.map((c) => c.id), default: 'other' },
    description: { type: String, maxlength: 1000 },
    priceCents: { type: Number, required: true, min: 1 },
    stock: { type: Number, default: 0, min: 0 },
    requiresPrescription: { type: Boolean, default: false },
    image: { type: String },
    listed: { type: Boolean, default: true },
  },
  { timestamps: true },
);
ProductSchema.index({ pharmacyId: 1, listed: 1, category: 1 });

/**
 * A pharmacy withdrawing its earnings (delivered orders, minus commission). The balance is
 * never stored: it's always delivered earnings minus withdrawals that aren't rejected/failed,
 * so a rejected or failed withdrawal simply counts again. `open` is set while one is pending or
 * being sent, and a unique index allows only one open withdrawal per pharmacy.
 */
export type PharmacyPayoutStatus = 'pending' | 'processing' | 'paid' | 'rejected' | 'failed';

export interface IPharmacyPayout extends Document {
  pharmacyId: Types.ObjectId | string;
  pharmacyName: string;
  cents: number;
  bank: { bankName: string; bankCode?: string; accountNumber: string; accountName: string; verified: boolean };
  requestedBy: { staffId: string; name: string };
  status: PharmacyPayoutStatus;
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

export const PharmacyPayoutSchema = new Schema<IPharmacyPayout>(
  {
    pharmacyId: { type: Schema.Types.ObjectId, ref: 'pharmacy', required: true, index: true },
    pharmacyName: { type: String, required: true },
    cents: { type: Number, required: true, min: 1 },
    bank: {
      bankName: { type: String, required: true },
      bankCode: String,
      accountNumber: { type: String, required: true },
      accountName: { type: String, required: true },
      verified: { type: Boolean, default: false },
    },
    requestedBy: { staffId: String, name: String },
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
PharmacyPayoutSchema.index({ pharmacyId: 1 }, { unique: true, partialFilterExpression: { open: true }, name: 'one_open_payout_per_pharmacy' });
