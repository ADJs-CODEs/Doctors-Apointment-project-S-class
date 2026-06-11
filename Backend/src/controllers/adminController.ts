import validator from 'validator'
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import doctorModel from '../models/doctorsModel.js'
import jwt from 'jsonwebtoken'
import appointmentModel from '../models/appointmentModel.js'
import userModel from '../models/userModel.js'
import { type Request, type Response } from 'express';



//API for adding doctor
const addDoctor = async (req: Request, res: Response) => {

  try {
    const { name, password, speciality, degree, experience, about, fees, address } = req.body
    const email = req.body.email ? req.body.email.toLowerCase().trim() : "";
    const imageFile = req.file

    // checkin for all data to add doctor
    if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
      return res.status(400).json({ success: false, message: "Missing Details" })
    }

    // validating email format 
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email" })
    }

    // validating strong password
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Please enter a strong password" })
    }



    //upload image to cloudinary

    if (!imageFile) {
      return res.status(400).json({ success: false, message: "Doctor Image is required" })
    }

    // hashing doctor password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
    const imageUrl = imageUpload.secure_url
    const doctorData = {
      name,
      email,
      image: imageUrl,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now()
    }

    const newDoctor = new doctorModel(doctorData)
    await newDoctor.save()

    res.status(201).json({ success: true, message: "Doctor Added" })
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })

  }
}

// API for the admin login
const loginAdmin = async (req: Request, res: Response) => {
  try {

    const { email, password } = req.body

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {

      const token = jwt.sign(email + password, process.env.JWT_SECRET as string)
      res.status(200).json({ success: true, token })

    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" })
    }

  } catch (error: any) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })

  }
}

// API to get all doctors list for admin panel
const allDoctors = async (req: Request, res: Response) => {
  try {
    const doctors = await doctorModel.find({}).select('-password')
    res.status(200).json({ success: true, doctors })
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })

  }
}

//API to get all appointments list

const appointmentsAdmin = async (req: Request, res: Response) => {
  try {
    const appointments = await appointmentModel.find({})
    res.status(200).json({ success: true, appointments })
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}

//API for appointment cancellation
const appointmentCancel = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.body

    const appointmentData = await appointmentModel.findById(appointmentId)

    if (!appointmentData) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
    //releasing   doctor slot
    const { docId, slotTime, slotDate } = appointmentData
    const doctorData = await doctorModel.findById(docId)

    if (!doctorData) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    let slots_booked = doctorData.slots_booked || {};
    if (slots_booked[slotDate]) {
      slots_booked[slotDate] = slots_booked[slotDate].filter((time: string) => time !== slotTime);
    }


    await doctorModel.findByIdAndUpdate(docId, { slots_booked })
    res.status(200).json({ success: true, message: 'Appointment Canceled' })

  } catch (error: any) {
    console.log(error)
    res.status(500).json({
      success: false, message: error.message
    })
  }
}

//API to get dashboard for admin panel
const adminDashboard = async (req: Request, res: Response) => {
  try {
    const [doctors, users, appointments] = await Promise.all([
      doctorModel.find({}),
      userModel.find({}),
      appointmentModel.find({})
    ]);
    const dashData = {
      doctors: doctors.length,
      appointments: appointments.length,
      patients: users.length,
      latestAppointments: appointments.reverse().slice(0, 5)

    }

    res.status(200).json({ success: true, dashData })


  } catch (error: any) {
    console.log(error)
    res.status(500).json({
      success: false, message: error.message
    })
  }
}

const deleteDoctor = async (req: Request, res: Response) => {
  try {
    // Explicitly cast or destructure the body
    const { docId }: { docId: string } = req.body;

    if (!docId) {
      return res.status(400).json({ success: false, message: "Doctor ID is required" });
    }

    // 1. Remove the doctor
    const deletedDoctor = await doctorModel.findByIdAndDelete(docId);

    if (!deletedDoctor) {
      return res.status(404).json({ success: false, message: "Doctor not found in registry" });
    }

    // 2. Cleanup appointments
    await appointmentModel.deleteMany({ docId });

    return res.status(200).json({ success: true, message: "Doctor and associated records terminated" });

  } catch (error: any) {
    console.error("Delete Doctor Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { addDoctor, loginAdmin, allDoctors, appointmentsAdmin, appointmentCancel, adminDashboard, deleteDoctor }