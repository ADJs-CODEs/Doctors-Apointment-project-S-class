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

export interface INotification extends Document {
  userId: string;
  title: string;
  message: string;
  type: 'dose' | 'appointment' | 'alert' | 'general';
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
      enum: ['dose', 'appointment', 'alert', 'general'],
      default: 'general',
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

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
  },
  { timestamps: true },
);
