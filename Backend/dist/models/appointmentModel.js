import mongoose, { Document, Model, Schema } from 'mongoose';
const appointmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    userData: { type: Object, required: true },
    docData: { type: Object, required: true },
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    patientStatus: {
        type: String,
        enum: ['Stable', 'Critical', 'Completed'],
        default: 'Stable'
    },
    messages: [{
            sender: { type: String, enum: ['Doctor', 'System'], default: 'Doctor' },
            content: { type: String, required: true },
            sentAt: { type: Date, default: Date.now },
            isRead: { type: Boolean, default: false }
        }],
    lastWarningSent: { type: Date },
    healthData: {
        bloodPressure: { type: String, default: "" },
        heartRate: { type: String, default: "" },
        temperature: { type: String, default: "" },
        prescribedMedicines: [{
                _id: false, // Prevents validation issues with sub-documents
                name: { type: String, required: true },
                // --- FIX: Added default so it never evaluates to "undefined" ---
                dosagePerDay: { type: Number, required: true, default: 1 },
                totalQuantity: { type: Number, required: true },
                remainingQuantity: { type: Number, required: true },
                lastTaken: { type: Date },
                overdoseAlert: { type: Boolean, default: false },
                adherenceLogs: [{ type: Date }],
                status: { type: String, enum: ['Active', 'Completed'], default: 'Active' }
            }],
        doctorNotes: { type: String, default: "" }
    }
    //used time stamp to creates a cratedAt and an updatedAt value 
}, { minimize: false, timestamps: true });
const appointmentModel = mongoose.models.appointment || mongoose.model('appointment', appointmentSchema);
export default appointmentModel;
//# sourceMappingURL=appointmentModel.js.map