import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from '../models/userModel.js'
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary'
import doctorModel from '../models/doctorsModel.js'
import appointmentModel from '../models/appointmentModel.js'
import stripe from 'stripe'
import { type Request, type Response } from 'express';
import crypto from 'crypto'
import axios from 'axios'
import nodemailer from 'nodemailer'

// 1. Initialize Stripe only ONCE at the top
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY as string)

// --- AUTHENTICATION ---

const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.json({ success: false, message: 'missing details' })
    if (!validator.isEmail(email)) return res.json({ success: false, message: 'enter a valid email' })
    if (password.length < 8) return res.json({ success: false, message: 'enter a strong password' })

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = await new userModel({ name, email, password: hashedPassword }).save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string)
    res.json({ success: true, token })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const user = await userModel.findOne({ email })
    if (!user) return res.json({ success: false, message: 'user does not exist' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string)
      res.json({ success: true, token })
    } else {
      res.json({ success: false, message: 'invalid credentials' })
    }
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const googleAuth = async (req: Request, res: Response) => {
  try {
    const { access_token } = req.body
    if (!access_token) return res.json({ success: false, message: "Google token missing" })

    const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`)
    const { email, name, picture } = googleResponse.data

    let user = await userModel.findOne({ email })
    if (!user) {
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), salt)
      user = await new userModel({ name, email, password: hashedPassword, image: picture }).save()
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string)
    res.json({ success: true, token, name: user.name })
  } catch (error: any) {
    res.json({ success: false, message: "Google verification failed" })
  }
}

// --- PROFILE MANAGEMENT ---

const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userData = await userModel.findById(userId).select('-password')
    res.json({ success: true, userData })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, phone, address, dob, gender } = req.body
    if (!name || !phone || !address || !dob || !gender) return res.json({ success: false, message: 'Data Missing' })

    await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

    if (req.file) {
      const imageUpload = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' })
      await userModel.findByIdAndUpdate(userId, { image: imageUpload.secure_url })
    }
    res.json({ success: true, message: "Profile Updated" })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

// --- APPOINTMENTS & HEALTH DATA ---

const bookAppointment = async (req: Request, res: Response) => {
  try {
    const { userId, docId, slotDate, slotTime } = req.body
    const docData = await doctorModel.findById(docId).select('-password')
    if (!docData.available) return res.json({ success: false, message: 'Doctor not available' })

    let slots_booked = docData.slots_booked
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) return res.json({ success: false, message: 'Slot not available' })
      slots_booked[slotDate].push(slotTime)
    } else {
      slots_booked[slotDate] = [slotTime]
    }

    const userData = await userModel.findById(userId).select('-password')
    const appointmentData = {
      userId, docId, userData, docData,
      amount: docData.fees, slotTime, slotDate, date: Date.now()
    }

    await new appointmentModel(appointmentData).save()
    await doctorModel.findByIdAndUpdate(docId, { slots_booked })
    res.json({ success: true, message: 'Appointment Booked' })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const listAppointment = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body
    const appointments = await appointmentModel.find({ userId })
    res.json({ success: true, appointments })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { userId, appointmentId } = req.body
    const appointmentData = await appointmentModel.findById(appointmentId)
    if (appointmentData.userId.toString() !== userId) return res.json({ success: false, message: 'Unauthorized' })

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
    const { docId, slotTime, slotDate } = appointmentData
    const doctorData = await doctorModel.findById(docId)

    if (doctorData && doctorData.slots_booked[slotDate]) {
      doctorData.slots_booked[slotDate] = doctorData.slots_booked[slotDate].filter((e: string) => e !== slotTime)
      await doctorModel.findByIdAndUpdate(docId, { slots_booked: doctorData.slots_booked })
    }
    res.json({ success: true, message: 'Appointment Canceled' })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const updateMedicationDose = async (req: Request, res: Response) => {
  try {
    const { userId, appointmentId, medicineName, overdoseAlert } = req.body;
    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment) return res.json({ success: false, message: "Appointment not found" });
    if (appointment.userId.toString() !== userId.toString()) return res.json({ success: false, message: "Unauthorized" });
    if (!appointment.healthData?.prescribedMedicines) return res.json({ success: false, message: "No medication data found" });

    const medIndex = appointment.healthData.prescribedMedicines.findIndex((m: any) => m.name.toLowerCase() === medicineName.toLowerCase());
    if (medIndex === -1) return res.json({ success: false, message: "Medicine not found" });

    const medicine = appointment.healthData.prescribedMedicines[medIndex];
    if (medicine.remainingQuantity <= 0) return res.json({ success: false, message: "No doses left" });

    medicine.remainingQuantity -= 1;
    medicine.lastTaken = new Date();
    if (overdoseAlert) medicine.overdoseAlert = true;
    if (medicine.remainingQuantity === 0) medicine.status = 'Completed';

    appointment.markModified('healthData.prescribedMedicines');
    await appointment.save();
    res.json({ success: true, message: "Dose logged", remaining: medicine.remainingQuantity });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};

// --- PAYMENTS ---

const paymentStripe = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.body
    const appointmentData = await appointmentModel.findById(appointmentId)
    if (!appointmentData || appointmentData.cancelled) return res.json({ success: false, message: "Invalid appointment" })

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${process.env.CLIENT_URL}/verify?success=true&appointmentId=${appointmentId}`,
      cancel_url: `${process.env.CLIENT_URL}/verify?success=false&appointmentId=${appointmentId}`,
      line_items: [{
        price_data: {
          currency: process.env.CURRENCY || 'usd',
          product_data: { name: `Appointment with ${appointmentData.docData.name}` },
          unit_amount: appointmentData.amount * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
    })
    res.json({ success: true, session_url: session.url })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const verifyStripe = async (req: Request, res: Response) => {
  try {
    const { appointmentId, success } = req.body;
    if (success === "true") {
      await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true });
      res.json({ success: true, message: "Payment Successful" });
    } else {
      res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
}

// --- SECURITY & ACCOUNT ---

const changePassword = async (req: Request, res: Response) => {
  try {
    const { userId, oldPassword, newPassword } = req.body
    const user = await userModel.findById(userId)
    if (!user) return res.json({ success: false, message: "User not found" })

    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) return res.json({ success: false, message: "Incorrect current password" })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(newPassword, salt)
    await user.save()
    res.json({ success: true, message: "Password updated" })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    const user = await userModel.findOne({ email })
    if (!user) return res.json({ success: false, message: "Email not found" })

    const token = crypto.randomBytes(40).toString('hex')
    user.resetToken = token
    user.resetTokenExpire = Date.now() + 15 * 60 * 1000
    await user.save()

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Reset Password',
      html: `<a href="${process.env.CLIENT_URL}/reset-password/${token}">Reset Link</a>`
    })
    res.json({ success: true, message: "Reset link sent" })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body
    const user = await userModel.findOne({ resetToken: token, resetTokenExpire: { $gt: Date.now() } })
    if (!user) return res.json({ success: false, message: "Invalid/Expired token" })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(newPassword, salt)
    user.resetToken = ""
    user.resetTokenExpire = 0
    await user.save()
    res.json({ success: true, message: "Password reset successful" })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body
    await userModel.findByIdAndDelete(userId)
    await appointmentModel.deleteMany({ userId })
    res.json({ success: true, message: "Account permanently deleted" })
  } catch (error: any) {
    res.json({ success: false, message: error.message })
  }
}

export {
  registerUser, loginUser, getProfile, updateProfile, bookAppointment,
  listAppointment, cancelAppointment, paymentStripe, verifyStripe,
  updateMedicationDose, googleAuth, changePassword, deleteAccount,
  forgotPassword, resetPassword
}