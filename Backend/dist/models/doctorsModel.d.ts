import { Document, Model } from 'mongoose';
export interface IDoctor extends Document {
    name: string;
    email: string;
    password: string;
    image: string;
    speciality: string;
    degree: string;
    experience: string;
    about: string;
    available: boolean;
    fees: number;
    address: {
        line1: string;
        line2: string;
    };
    date: number;
    slots_booked: Record<string, string[]>;
}
declare const doctorModel: Model<IDoctor>;
export default doctorModel;
//# sourceMappingURL=doctorsModel.d.ts.map