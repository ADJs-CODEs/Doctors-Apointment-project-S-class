import { Document, Model } from "mongoose";
export interface IEmojiPing extends Document {
    fromUserId: string;
    toUserId: string;
    emoji: string;
    fromName: string;
    delivered: boolean;
    createdAt: Date;
}
declare const emojiPingModel: Model<IEmojiPing>;
export default emojiPingModel;
//# sourceMappingURL=emojiPingModel.d.ts.map