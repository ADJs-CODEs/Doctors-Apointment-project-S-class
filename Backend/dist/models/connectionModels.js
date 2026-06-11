import mongoose, { Document, Model, Schema } from "mongoose";
const connectionSchema = new mongoose.Schema({
    requesterId: { type: String, required: true },
    patientId: { type: String, required: true },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
    },
}, { timestamps: true });
// Prevent duplicate connection requests
connectionSchema.index({ requesterId: 1, patientId: 1 }, { unique: true });
const connectionModel = mongoose.models.connection ||
    mongoose.model("connection", connectionSchema);
export default connectionModel;
//# sourceMappingURL=connectionModels.js.map