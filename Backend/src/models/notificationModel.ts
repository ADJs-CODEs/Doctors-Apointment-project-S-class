import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotification extends Document {
  userId: string;
  title: string;
  message: string;
  type: "dose" | "appointment" | "alert" | "general";
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema: Schema<INotification> = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["dose", "appointment", "alert", "general"],
      default: "general",
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const notificationModel: Model<INotification> =
  mongoose.models.notification ||
  mongoose.model<INotification>("notification", notificationSchema);

export default notificationModel;
