import doctorModel from "../models/doctorsModel.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import appointmentModel from "../models/appointmentModel.js"
import { type Request, type Response } from 'express';

interface Appointment {
  userId: string;
  amount: number;
  isCompleted: boolean;
  payment: boolean;
}



const changeAvailability = async (req: Request, res: Response) => {
  try {

    const { docId } = req.body;

    const docData = await doctorModel.findById(docId)
    if (!docData) {
      return res.json({ success: false, message: 'Doctor not found' })
    }
    await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
    res.json({ success: true, message: 'Availability changed' })

  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

const doctorList = async (req: Request, res: Response) => {
  try {
    const doctors = await doctorModel.find({}).select(['-password', '-email'])

    res.json({ success: true, doctors })

  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

//API for doctor Login

const loginDoctor = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const doctor = await doctorModel.findOne({ email })
    if (!doctor) {
      return res.json({ success: false, message: "invalid credentials" })
    }
    const isMatch = await bcrypt.compare(password, doctor.password)

    if (isMatch) {
      const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET as string)
      res.json({ success: true, token })
    } else {
      res.json({ success: false, message: "invalid credentials" })
    }

  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }


}

//API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req: Request, res: Response) => {
  try {

    const docId = req.docId
    const appointments = await appointmentModel.find({ docId })

    res.json({ success: true, appointments })

  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
//API to mark appointment completed
// API to mark appointment completed with Health Data
const appointmentComplete = async (req: Request, res: Response) => {
  try {
    const docId = req.docId
    const { appointmentId, healthData } = req.body

    const appointmentData = await appointmentModel.findById(appointmentId)

    if (appointmentData && appointmentData.docId.toString() === docId) {

      // We update the healthData object and set isCompleted to true
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        isCompleted: true,
        healthData: {
          bloodPressure: healthData.bloodPressure,
          heartRate: healthData.heartRate,
          temperature: healthData.temperature,
          doctorNotes: healthData.doctorNotes,
          // Map the medicines to ensure initial remainingQuantity equals totalQuantity
          prescribedMedicines: healthData.prescribedMedicines.map((med: any) => ({
            ...med,
            remainingQuantity: med.totalQuantity,
            adherenceLogs: [],
            status: 'Active'
          }))
        }
      })

      return res.json({ success: true, message: 'Appointment Completed & Registry Updated' })
    } else {
      return res.json({ success: false, message: "Authorization Failed" })
    }
  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

//API to cancel appointment for doctor Panel
const appointmentCancel = async (req: Request, res: Response) => {
  try {
    const docId = req.docId
    const { appointmentId } = req.body

    const appointmentData = await appointmentModel.findById(appointmentId)

    if (appointmentData && appointmentData.docId.toString() === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
      return res.json({ success: true, message: 'Appointment Cancelled' })
    }
    else {
      res.json({ success: false, message: " Cancellation Failed" })
    }
  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
//API to get dashboard dta for doctor panel
const doctorDashboard = async (req: Request, res: Response) => {
  try {

    const docId = req.docId

    const appointments = await appointmentModel.find({ docId })

    let earnings = 0
    appointments.map((item: Appointment) => {
      if (item.isCompleted || item.payment) {
        earnings += item.amount
      }
    })
    let patients: string[] = []

    appointments.map((item: Appointment) => {
      if (!patients.includes(item.userId.toString())) {
        patients.push(item.userId.toString());
      }
    })
    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointment: appointments.reverse().slice(0, 5)
    }
    res.json({ success: true, dashData })
  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
//API to get doctor profile for Doctor Panel
const doctorProfile = async (req: Request, res: Response) => {
  try {

    const docId = req.docId
    const profileData = await doctorModel.findById(docId).select('-password')

    res.json({ success: true, profileData })

  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// API to update doctor proffile data from Doctor Panel 
const updateDoctorProfile = async (req: Request, res: Response) => {
  try {
    const { fees, address, available } = req.body
    const docId = req.docId
    await doctorModel.findByIdAndUpdate(docId, { fees, address, available })
    res.json({ success: true, message: 'profile Updates' })
  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

export { changeAvailability, doctorList, loginDoctor, appointmentsDoctor, appointmentCancel, appointmentComplete, doctorDashboard, doctorProfile, updateDoctorProfile }