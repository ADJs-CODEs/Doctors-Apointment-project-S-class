import mongoose, { Document, Model, Schema } from 'mongoose';


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
  //Record<string, string[]> storing my key and value as strings, key which is the date and value which is the time.
  slots_booked: Record<string, string[]>;
}

const doctorSchema: Schema<IDoctor> = new mongoose.Schema({
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
}, { minimize: false })

const doctorModel: Model<IDoctor> = mongoose.models.doctor || mongoose.model<IDoctor>('doctor', doctorSchema)

export default doctorModel