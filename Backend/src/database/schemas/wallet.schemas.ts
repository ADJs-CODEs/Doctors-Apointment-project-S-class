import { Schema, type Document } from 'mongoose';

// Wish Well gifting (TikTok-style): people buy coins, spend them on gifts for Wish Well
// patients, and each gift's value (minus the platform fee) goes into that patient's care
// fund, which they can withdraw through an admin-approved payout. 1 coin = 1 cent.

/** One per user; created on first use. */
export interface IWallet extends Document {
  userId: string;
  /** spendable coins (bought) */
  coins: number;
  /** care fund available to withdraw, in cents, after the platform fee */
  fundCents: number;
  /** everything ever received into the care fund, in cents (for "raised so far") */
  fundLifetimeCents: number;
}

export const WalletSchema = new Schema<IWallet>(
  {
    userId: { type: String, required: true, unique: true },
    coins: { type: Number, default: 0, min: 0 },
    fundCents: { type: Number, default: 0, min: 0 },
    fundLifetimeCents: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/**
 * The ledger: every change to a wallet, so balances can always be explained.
 * coins / cents are signed (+ in, - out).
 */
export interface IWalletTransaction extends Document {
  userId: string;
  kind:
    | 'topup'
    | 'gift_sent'
    | 'gift_received'
    | 'payout_requested'
    | 'payout_returned'
    | 'appointment_payment'
    | 'appointment_refund';
  appointmentId?: string;
  coins: number;
  cents: number;
  giftId?: string;
  /** the other person in a gift */
  counterpartyId?: string;
  counterpartyName?: string;
  entryId?: string;
  /** Stripe Checkout session for top-ups; unique, so a payment is only credited once */
  stripeSessionId?: string;
  payoutId?: string;
  note?: string;
  createdAt: Date;
}

export const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    userId: { type: String, required: true, index: true },
    kind: {
      type: String,
      enum: [
        'topup',
        'gift_sent',
        'gift_received',
        'payout_requested',
        'payout_returned',
        'appointment_payment',
        'appointment_refund',
      ],
      required: true,
    },
    appointmentId: { type: String },
    coins: { type: Number, default: 0 },
    cents: { type: Number, default: 0 },
    giftId: { type: String },
    counterpartyId: { type: String },
    counterpartyName: { type: String },
    entryId: { type: String },
    stripeSessionId: { type: String },
    payoutId: { type: String },
    note: { type: String },
  },
  { timestamps: true },
);
WalletTransactionSchema.index({ stripeSessionId: 1 }, { unique: true, sparse: true });
WalletTransactionSchema.index({ userId: 1, kind: 1, createdAt: -1 });

/** A gift that was sent, for the Wish Well banner and the patient's "who sent what". */
export interface IGiftEvent extends Document {
  fromUserId: string;
  /** shown name; "Someone" when sent anonymously */
  fromName: string;
  anonymous: boolean;
  toUserId: string;
  toName: string;
  entryId: string;
  giftId: string;
  coins: number;
  createdAt: Date;
}

export const GiftEventSchema = new Schema<IGiftEvent>(
  {
    fromUserId: { type: String, required: true },
    fromName: { type: String, required: true },
    anonymous: { type: Boolean, default: false },
    toUserId: { type: String, required: true, index: true },
    toName: { type: String, required: true },
    entryId: { type: String, required: true },
    giftId: { type: String, required: true },
    coins: { type: Number, required: true },
  },
  { timestamps: true },
);
GiftEventSchema.index({ coins: -1, createdAt: -1 });

/** A patient withdrawing their care fund. The admin verifies identity, sends it, marks it paid. */
export interface IPayout extends Document {
  userId: string;
  userName: string;
  userEmail: string;
  cents: number;
  accountName: string;
  bankName: string;
  accountNumber: string;
  note?: string;
  // pending: waiting for the admin. processing: sent through Paystack, waiting for the bank.
  // paid: money arrived (or the admin sent it by hand). rejected/failed: the fund got it back.
  status: 'pending' | 'processing' | 'paid' | 'rejected' | 'failed';
  /** the bank/transfer reference (entered by the admin, or Paystack's) */
  reference?: string;
  adminNote?: string;
  decidedAt?: Date;
  /** Paystack bank code, and the account holder's name as the bank reported it */
  bankCode?: string;
  resolvedAccountName?: string;
  provider?: 'manual' | 'paystack';
  /** what's actually sent, e.g. 12,000.00 NGN for a $8.00 fund (minor units, e.g. kobo) */
  payoutCurrency?: string;
  payoutMinor?: number;
  transferCode?: string;
  failureReason?: string;
  createdAt: Date;
}

export const PayoutSchema = new Schema<IPayout>(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    cents: { type: Number, required: true, min: 1 },
    accountName: { type: String, required: true, maxlength: 120 },
    bankName: { type: String, required: true, maxlength: 120 },
    accountNumber: { type: String, required: true, maxlength: 40 },
    note: { type: String, maxlength: 500 },
    status: { type: String, enum: ['pending', 'processing', 'paid', 'rejected', 'failed'], default: 'pending' },
    reference: { type: String, maxlength: 120 },
    adminNote: { type: String, maxlength: 500 },
    decidedAt: { type: Date },
    bankCode: { type: String, maxlength: 20 },
    resolvedAccountName: { type: String, maxlength: 120 },
    provider: { type: String, enum: ['manual', 'paystack'] },
    payoutCurrency: { type: String, maxlength: 5 },
    payoutMinor: { type: Number },
    transferCode: { type: String, maxlength: 60 },
    failureReason: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);
