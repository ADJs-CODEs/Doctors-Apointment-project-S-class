import doctorModel from "../models/doctorsModel.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import appointmentModel from "../models/appointmentModel.js"
import { type Request, type Response } from 'express';
import nodemailer from 'nodemailer'



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
const appointmentsDoctor = async (req: Request, res: Response): Promise<void> => {
  try {

    const docId = req.docId

    if (!docId) {
      res.status(400).json({
        success: false,
        message: "Authentication Error: Doctor ID missing."
      });
      return;
    }
    const appointments = await appointmentModel.find({ docId })

    res.json({ success: true, appointments })

  } catch (error: any) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
//API to mark appointment completed


const appointmentComplete = async (req: Request, res: Response) => {
  try {
    const docId = (req as any).docId;
    const { appointmentId, healthData } = req.body;

    if (!healthData) return res.json({ success: false, message: "Health data required" });

    const appointmentData = await appointmentModel.findById(appointmentId);

    if (appointmentData && appointmentData.docId.toString() === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        isCompleted: true,
        healthData: {
          bloodPressure: healthData.bloodPressure,
          heartRate: healthData.heartRate,
          temperature: healthData.temperature,
          doctorNotes: healthData.doctorNotes,
          prescribedMedicines: (healthData.prescribedMedicines || []).map((med: any) => ({
            ...med,
            remainingQuantity: Number(med.totalQuantity),
            adherenceLogs: [],
            status: 'Active'
          }))
        }
      });
      return res.json({ success: true, message: 'Appointment Completed' });
    }
    res.json({ success: false, message: "Auth Failed" });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
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
const doctorDashboard = async (req: Request, res: Response): Promise<void> => {
  try {

    const docId = req.docId

    if (!docId) {
      res.status(400).json({ success: false, message: "Doctor ID missing" });
      return;
    }

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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendPatientAlert = async (req: Request, res: Response) => {
  try {
    const { appointmentId, messageContent, isCritical } = req.body;

    // 1. Find the appointment and populate user email
    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // 2. Update the Database (UI Trigger)
    const newMessage = {
      sender: 'Doctor' as const,
      content: messageContent,
      sentAt: new Date(),
      isRead: false
    };

    appointment.messages.push(newMessage);

    // If doctor marks as critical, update status
    if (isCritical) {
      appointment.patientStatus = 'Critical';
    }

    appointment.lastWarningSent = new Date();
    await appointment.save();

    // 3. Trigger the Email (Nodemailer)
    const mailOptions = {
      from: `Dr. ${appointment.docData.name} <${process.env.SMTP_USER}>`,
      replyTo: appointment.docData.email,
      to: appointment.userData.email, // Ensure userData has email
      subject: isCritical ? "URGENT: Medical Alert from your Doctor" : "New Message from your Doctor",
      text: `Hello ${appointment.userData.name},\n\nYour doctor has sent you a message regarding your appointment:\n\n"${messageContent}"\n\nPlease log into the app to view details.`,
      html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: ${isCritical ? '#ef4444' : '#0d9488'};">Medical Notification</h2>
                    <p>Hello <strong>${appointment.userData.name}</strong>,</p>
                    <p>Your doctor has sent a new update regarding your medication schedule:</p>
                    <blockquote style="background: #f9fafb; padding: 15px; border-left: 4px solid #0d9488;">
                        ${messageContent}
                    </blockquote>
                    <p>Please check your mobile app for live tracking updates.</p>
                </div>
            `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Alert sent to patient successfully" });

  } catch (error: any) {
    console.error("ALERT ERROR:", error);
    res.json({ success: false, message: "Failed to send alert: " + error.message });
  }
};

export { changeAvailability, doctorList, loginDoctor, appointmentsDoctor, appointmentCancel, appointmentComplete, doctorDashboard, doctorProfile, updateDoctorProfile, sendPatientAlert }