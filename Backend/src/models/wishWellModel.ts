import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWishWell extends Document {
  patientId: string;
  patientName: string;
  patientImage: string;
  doctorId: string;
  doctorName: string;
  condition: string;
  story: string;
  status: "critical" | "recovered" | "passed";
  consentGiven: boolean;
  optedOut: boolean;
  emojiCounts: {
    heart: number;
    flower: number;
    clap: number;
    star: number;
    prayer: number;
  };
  totalEmojis: number;
  createdAt: Date;
  updatedAt: Date;
}

const wishWellSchema: Schema<IWishWell> = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    patientImage: { type: String, default: "" },
    doctorId: { type: String, required: true },
    doctorName: { type: String, required: true },
    condition: { type: String, required: true },
    story: { type: String, required: true },
    status: {
      type: String,
      enum: ["critical", "recovered", "passed"],
      default: "critical",
    },
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

const wishWellModel: Model<IWishWell> =
  mongoose.models.wishwell ||
  mongoose.model<IWishWell>("wishwell", wishWellSchema);

export default wishWellModel;
