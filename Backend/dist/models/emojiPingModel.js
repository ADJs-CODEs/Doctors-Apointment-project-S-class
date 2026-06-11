import mongoose, { Document, Model, Schema } from "mongoose";
const emojiPingSchema = new mongoose.Schema({
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    emoji: { type: String, required: true },
    fromName: { type: String, required: true },
    delivered: { type: Boolean, default: false },
}, { timestamps: true });
const emojiPingModel = mongoose.models.emojipping ||
    mongoose.model("emojipping", emojiPingSchema);
export default emojiPingModel;
//# sourceMappingURL=emojiPingModel.js.map