import { Document, Model } from 'mongoose';
interface IMessage {
    sender: 'Doctor' | 'System';
    content: string;
    sentAt: Date;
    isRead: boolean;
}
interface IMedicine {
    name: string;
    dosagePerDay: number;
    totalQuantity: number;
    remainingQuantity: number;
    lastTaken?: Date;
    overdoseAlert: boolean;
    adherenceLogs: Date[];
    status: 'Active' | 'Completed';
}
interface IHealthData {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    prescribedMedicines: IMedicine[];
    doctorNotes: string;
}
export interface IAppointment extends Document {
    userId: string;
    docId: string;
    slotDate: string;
    slotTime: string;
    userData: any;
    docData: any;
    amount: number;
    date: number;
    cancelled: boolean;
    payment: boolean;
    isCompleted: boolean;
    healthData: IHealthData;
    patientStatus: 'Stable' | 'Critical' | 'Completed';
    messages: IMessage[];
    lastWarningSent?: Date;
}
declare const appointmentModel: Model<IAppointment>;
export default appointmentModel;
//# sourceMappingURL=appointmentModel.d.ts.map