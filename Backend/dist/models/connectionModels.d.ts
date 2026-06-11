import { Document, Model } from "mongoose";
export interface IConnection extends Document {
    requesterId: string;
    patientId: string;
    status: "pending" | "accepted" | "rejected";
    createdAt: Date;
    updatedAt: Date;
}
declare const connectionModel: Model<IConnection>;
export default connectionModel;
//# sourceMappingURL=connectionModels.d.ts.map