import { Document, Model } from 'mongoose';
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    image: string;
    address: {
        line1: string;
        line2: string;
    };
    gender: string;
    dob: string;
    phone: string;
    resetToken: string;
    resetTokenExpire: number;
}
declare const userModel: Model<IUser>;
export default userModel;
//# sourceMappingURL=userModel.d.ts.map