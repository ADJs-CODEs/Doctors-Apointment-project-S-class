import { Schema, type Document } from 'mongoose';

// --- connections ("watching over") ---

export interface IConnection extends Document {
  requesterId: string; // the person asking to watch
  patientId: string; // the person being watched
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export const ConnectionSchema = new Schema<IConnection>(
  {
    requesterId: { type: String, required: true },
    patientId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);
ConnectionSchema.index({ requesterId: 1, patientId: 1 }, { unique: true });

// --- emoji pings ---

export interface IEmojiPing extends Document {
  fromUserId: string;
  toUserId: string;
  emoji: string;
  fromName: string;
  delivered: boolean;
  createdAt: Date;
}

export const EmojiPingSchema = new Schema<IEmojiPing>(
  {
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    emoji: { type: String, required: true },
    fromName: { type: String, required: true },
    delivered: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// --- notifications ---

export type NotificationType = 'dose' | 'appointment' | 'alert' | 'message' | 'payment' | 'care' | 'general';

export interface INotification extends Document {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  /** where tapping it should go, e.g. "/messages?doctor=..." */
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

export const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['dose', 'appointment', 'alert', 'message', 'payment', 'care', 'general'],
      default: 'general',
    },
    link: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// --- web push: one row per browser/device that turned device notifications on ---

export interface IPushSubscription extends Document {
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt: Date;
}

export const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true },
);

// --- doctor <-> patient chat ---
// One conversation per doctor/patient pair; each message can say which visit or
// medicine it's about, so the doctor has the context without asking.

export interface IChatMessage extends Document {
  doctorId: string;
  userId: string;
  sender: 'doctor' | 'patient';
  text: string;
  urgent: boolean;
  appointmentId?: string;
  medicineName?: string;
  readAt: Date | null; // when the other side read it
  // "<appointmentId>:<sentAt ms>" for copies of appointment.messages, so they're only copied once
  legacyKey?: string;
  createdAt: Date;
}

export const ChatMessageSchema = new Schema<IChatMessage>(
  {
    doctorId: { type: String, required: true },
    userId: { type: String, required: true },
    sender: { type: String, enum: ['doctor', 'patient'], required: true },
    text: { type: String, required: true, maxlength: 4000 },
    urgent: { type: Boolean, default: false },
    appointmentId: { type: String },
    medicineName: { type: String },
    readAt: { type: Date, default: null },
    legacyKey: { type: String },
  },
  { timestamps: true },
);
ChatMessageSchema.index({ doctorId: 1, userId: 1, createdAt: 1 });
ChatMessageSchema.index({ legacyKey: 1 }, { unique: true, sparse: true });

// --- wish well ---

export interface IWishWell extends Document {
  patientId: string;
  patientName: string;
  patientImage: string;
  doctorId: string;
  doctorName: string;
  condition: string;
  story: string;
  status: 'critical' | 'recovered' | 'passed';
  consentGiven: boolean;
  optedOut: boolean;
  emojiCounts: { heart: number; flower: number; clap: number; star: number; prayer: number };
  totalEmojis: number;
  /** paid gifts received: how many and their total in coins */
  giftCount: number;
  giftCoins: number;
  createdAt: Date;
  updatedAt: Date;
}

export const WishWellSchema = new Schema<IWishWell>(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    patientImage: { type: String, default: '' },
    doctorId: { type: String, required: true },
    doctorName: { type: String, required: true },
    condition: { type: String, required: true },
    story: { type: String, required: true },
    status: { type: String, enum: ['critical', 'recovered', 'passed'], default: 'critical' },
    consentGiven: { type: Boolean, default: false },
    optedOut: { type: Boolean, default: false },
    emojiCounts: {
      heart: { type: Number, default: 0 },
      flower: { type: Number, default: 0 },
      clap: { type: Number, default: 0 },
      star: { type: Number, default: 0 },
      prayer: { type: Number, default: 0 },
    },
    totalEmojis: { type: Number, default: 0 },
    giftCount: { type: Number, default: 0 },
    giftCoins: { type: Number, default: 0 },
  },
  { timestamps: true },
);
