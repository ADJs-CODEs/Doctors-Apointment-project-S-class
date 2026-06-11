import { Document, Model } from "mongoose";
export interface INotification extends Document {
    userId: string;
    title: string;
    message: string;
    type: "dose" | "appointment" | "alert" | "general";
    isRead: boolean;
    createdAt: Date;
}
declare const notificationModel: Model<INotification>;
export default notificationModel;
//# sourceMappingURL=notificationModel.d.ts.map