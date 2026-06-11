import { Document, Model } from "mongoose";
export interface IWishWell extends Document {
    patientId: string;
    patientName: string;
    patientImage: string;
    doctorId: string;
    doctorName: string;
    condition: string;
    story: string;
    status: "critical" | "recovered" | "passed";
    consentGiven: boolean;
    optedOut: boolean;
    emojiCounts: {
        heart: number;
        flower: number;
        clap: number;
        star: number;
        prayer: number;
    };
    totalEmojis: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const wishWellModel: Model<IWishWell>;
export default wishWellModel;
//# sourceMappingURL=wishWellModel.d.ts.map