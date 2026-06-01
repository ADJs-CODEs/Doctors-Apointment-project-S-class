import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEmojiPing extends Document {
  fromUserId: string;
  toUserId: string;
  emoji: string;
  fromName: string;
  delivered: boolean;
  createdAt: Date;
}

const emojiPingSchema: Schema<IEmojiPing> = new mongoose.Schema(
  {
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    emoji: { type: String, required: true },
    fromName: { type: String, required: true },
    delivered: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const emojiPingModel: Model<IEmojiPing> =
  mongoose.models.emojipping ||
  mongoose.model<IEmojiPing>("emojipping", emojiPingSchema);

export default emojiPingModel;
