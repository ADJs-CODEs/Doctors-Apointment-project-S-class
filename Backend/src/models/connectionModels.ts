import mongoose, { Document, Model, Schema } from "mongoose";

export interface IConnection extends Document {
  requesterId: string; // the person who sent the watch request
  patientId: string; // the person being watched
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema: Schema<IConnection> = new mongoose.Schema(
  {
    requesterId: { type: String, required: true },
    patientId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// Prevent duplicate connection requests
connectionSchema.index({ requesterId: 1, patientId: 1 }, { unique: true });

const connectionModel: Model<IConnection> =
  mongoose.models.connection ||
  mongoose.model<IConnection>("connection", connectionSchema);

export default connectionModel;
