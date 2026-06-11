import mongoose, { Document, Model, Schema } from "mongoose";
const notificationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ["dose", "appointment", "alert", "general"],
        default: "general",
    },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });
const notificationModel = mongoose.models.notification ||
    mongoose.model("notification", notificationSchema);
export default notificationModel;
//# sourceMappingURL=notificationModel.js.map