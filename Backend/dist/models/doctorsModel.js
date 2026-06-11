import mongoose, { Document, Model, Schema } from 'mongoose';
const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    speciality: {
        type: String,
        required: true,
    },
    degree: {
        type: String,
        required: true,
    },
    experience: {
        type: String,
        required: true,
    },
    about: {
        type: String,
        required: true,
    },
    available: {
        type: Boolean,
        default: true,
    },
    fees: {
        type: Number,
        required: true,
    },
    address: {
        type: Object,
        required: true,
    },
    date: {
        type: Number,
        required: true,
    },
    slots_booked: {
        type: Object,
        default: {},
    },
    //Minimize false since i'm leaving my slots booked as an empty object to prevent mongoose from deleting it to save space and causing a front end crash, i used minimize false
}, { minimize: false });
const doctorModel = mongoose.models.doctor || mongoose.model('doctor', doctorSchema);
export default doctorModel;
//# sourceMappingURL=doctorsModel.js.map