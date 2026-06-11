import mongoose, { Document, Model, Schema } from "mongoose";
const wishWellSchema = new mongoose.Schema({
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
}, { timestamps: true });
const wishWellModel = mongoose.models.wishwell ||
    mongoose.model("wishwell", wishWellSchema);
export default wishWellModel;
//# sourceMappingURL=wishWellModel.js.map