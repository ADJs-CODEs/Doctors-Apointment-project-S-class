import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorsModel.js";
import appointmentModel from "../models/appointmentModel.js";
import stripe from "stripe";
import {} from "express";
import crypto from "crypto";
import axios from "axios";
import nodemailer from "nodemailer";
// 1. Initialize Stripe only ONCE at the top
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
// --- AUTHENTICATION ---
const registerUser = async (req, res) => {
    try {
        const { name, password } = req.body;
        const email = req.body.email ? req.body.email.toLowerCase().trim() : "";
        if (!name || !email || !password)
            return res
                .status(400)
                .json({ success: false, message: "missing details" });
        if (!validator.isEmail(email))
            return res
                .status(400)
                .json({ success: false, message: "enter a valid email" });
        if (password.length < 8)
            return res
                .status(400)
                .json({ success: false, message: "enter a strong password" });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await new userModel({
            name,
            email,
            password: hashedPassword,
        }).save();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        if (process.env.N8N_SIGNUP_WEBHOOK) {
            axios
                .post(process.env.N8N_SIGNUP_WEBHOOK, {
                name: user.name,
                email: user.email,
            })
                .catch((err) => console.warn("n8n signup webhook failed:", err.message));
        }
        res.status(201).json({ success: true, token });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const loginUser = async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.body.email ? req.body.email.toLowerCase().trim() : "";
        const user = await userModel.findOne({ email });
        if (!user)
            return res
                .status(404)
                .json({ success: false, message: "user does not exist" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
            if (process.env.N8N_LOGIN_WEBHOOK) {
                axios
                    .post(process.env.N8N_LOGIN_WEBHOOK, {
                    name: user.name,
                    email: user.email,
                    time: new Date().toLocaleString("en-GB", {
                        timeZone: "Africa/Lagos",
                    }),
                })
                    .catch((err) => console.warn("n8n login webhook failed:", err.message));
            }
            res.status(200).json({ success: true, token });
        }
        else {
            res.status(401).json({ success: false, message: "invalid credentials" });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const googleAuth = async (req, res) => {
    try {
        const { access_token } = req.body;
        if (!access_token)
            return res
                .status(400)
                .json({ success: false, message: "Google token missing" });
        const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
        let { email, name, picture } = googleResponse.data;
        if (email)
            email = email.toLowerCase().trim();
        let user = await userModel.findOne({ email });
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), salt);
            user = await new userModel({
                name,
                email,
                password: hashedPassword,
                image: picture,
            }).save();
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.status(200).json({ success: true, token, name: user.name });
    }
    catch (error) {
        res
            .status(401)
            .json({ success: false, message: "Google verification failed" });
    }
};
// --- PROFILE MANAGEMENT ---
const getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const userData = await userModel.findById(userId).select("-password");
        if (!userData)
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        res.status(200).json({ success: true, userData });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, phone, address, dob, gender } = req.body;
        if (!name || !phone || !address || !dob || !gender)
            return res.status(400).json({ success: false, message: "Data Missing" });
        await userModel.findByIdAndUpdate(userId, {
            name,
            phone,
            address: JSON.parse(address),
            dob,
            gender,
        });
        if (req.file) {
            const imageUpload = await cloudinary.uploader.upload(req.file.path, {
                resource_type: "image",
            });
            await userModel.findByIdAndUpdate(userId, {
                image: imageUpload.secure_url,
            });
        }
        res.status(200).json({ success: true, message: "Profile Updated" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// --- APPOINTMENTS & HEALTH DATA ---
const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body;
        const docData = await doctorModel.findById(docId).select("-password");
        if (!docData) {
            res.status(404).json({ success: false, message: "Doctor not found" });
            return;
        }
        if (!docData.available)
            return res
                .status(400)
                .json({ success: false, message: "Doctor not available" });
        let slots_booked = docData.slots_booked;
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime))
                return res
                    .status(400)
                    .json({ success: false, message: "Slot not available" });
            slots_booked[slotDate].push(slotTime);
        }
        else {
            slots_booked[slotDate] = [slotTime];
        }
        const userData = await userModel.findById(userId).select("-password");
        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now(),
        };
        const newAppointment = await new appointmentModel(appointmentData).save();
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });
        //Trigger n8n mail automation on successful booking
        if (process.env.N8N_BOOKING_WEBHOOK) {
            axios
                .post(process.env.N8N_BOOKING_WEBHOOK, {
                name: userData?.name,
                email: userData?.email,
                doctor: docData.name,
                slot: `${slotDate.replace(/_/g, "/")} at ${slotTime}`,
            })
                .catch((err) => console.warn("n8n booking webhook failed:", err.message));
        }
        res.status(201).json({
            success: true,
            message: "Appointment Booked",
            appointmentId: newAppointment._id,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Appointment list
const listAppointment = async (req, res) => {
    try {
        const { userId } = req.body;
        const appointments = await appointmentModel.find({ userId });
        res.status(200).json({ success: true, appointments });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Cancel Appointment
const cancelAppointment = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body;
        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData) {
            res
                .status(404)
                .json({ success: false, message: "Appointment not found" });
            return;
        }
        if (appointmentData.userId.toString() !== userId)
            return res.status(403).json({ success: false, message: "Unauthorized" });
        await appointmentModel.findByIdAndUpdate(appointmentId, {
            cancelled: true,
        });
        const { docId, slotTime, slotDate } = appointmentData;
        const doctorData = await doctorModel.findById(docId);
        if (doctorData && doctorData.slots_booked[slotDate]) {
            doctorData.slots_booked[slotDate] = doctorData.slots_booked[slotDate].filter((e) => e !== slotTime);
            await doctorModel.findByIdAndUpdate(docId, {
                slots_booked: doctorData.slots_booked,
            });
        }
        if (process.env.N8N_CANCEL_WEBHOOK) {
            axios
                .post(process.env.N8N_CANCEL_WEBHOOK, {
                patientName: appointmentData.userData?.name,
                patientEmail: appointmentData.userData?.email,
                doctorName: appointmentData.docData?.name,
                doctorEmail: appointmentData.docData?.email,
                slotDate: appointmentData.slotDate.replace(/_/g, "/"),
                slotTime: appointmentData.slotTime,
            })
                .catch((err) => console.warn("n8n cancel webhook failed:", err.message));
        }
        res.status(200).json({ success: true, message: "Appointment Canceled" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//Update medication dosage----
const updateMedicationDose = async (req, res) => {
    try {
        const { userId, appointmentId, medicineName, overdoseAlert } = req.body;
        const appointment = await appointmentModel.findById(appointmentId);
        if (!appointment)
            return res
                .status(404)
                .json({ success: false, message: "Appointment not found" });
        if (appointment.userId.toString() !== userId.toString())
            return res.status(403).json({ success: false, message: "Unauthorized" });
        if (!appointment.healthData?.prescribedMedicines)
            return res
                .status(400)
                .json({ success: false, message: "No medication data found" });
        // Find the medicine
        const medicine = appointment.healthData.prescribedMedicines.find((m) => m.name.toLowerCase() === medicineName.toLowerCase());
        if (!medicine)
            return res
                .status(404)
                .json({ success: false, message: "Medicine not found" });
        // Validation
        if (medicine.remainingQuantity <= 0) {
            return res.status(400).json({ success: false, message: "No doses left" });
        }
        // --- UPDATES ---
        const now = new Date();
        medicine.remainingQuantity -= 1;
        medicine.lastTaken = now;
        // Ensure adherenceLogs exists before pushing
        if (!medicine.adherenceLogs)
            medicine.adherenceLogs = [];
        medicine.adherenceLogs.push(now);
        if (overdoseAlert) {
            medicine.overdoseAlert = true;
            appointment.patientStatus = "Critical";
            if (process.env.N8N_OVERDOSE_WEBHOOK) {
                axios
                    .post(process.env.N8N_OVERDOSE_WEBHOOK, {
                    patientName: appointment.userData?.name,
                    patientEmail: appointment.userData?.email,
                    doctorEmail: appointment.docData?.email,
                    doctorName: appointment.docData?.name,
                    medicineName,
                    appointmentId: appointment._id,
                })
                    .catch((err) => console.warn("n8n overdose webhook failed:", err.message));
            }
        }
        if (medicine.remainingQuantity === 0)
            medicine.status = "Completed";
        // IMPORTANT: Tell Mongoose exactly which path changed
        appointment.markModified("healthData.prescribedMedicines");
        // Use validateModifiedOnly: true to prevent it from complaining about
        // existing fields like dosagePerDay that aren't being changed right now.
        await appointment.save({ validateModifiedOnly: true });
        if (process.env.N8N_DOSE_REMINDER_WEBHOOK &&
            medicine.remainingQuantity > 0) {
            const intervalHours = 24 / medicine.dosagePerDay;
            const nextDoseTime = new Date(Date.now() + intervalHours * 60 * 60 * 1000);
            const reminderAt30 = new Date(nextDoseTime.getTime() - 30 * 60 * 1000);
            const reminderAt5 = new Date(nextDoseTime.getTime() - 5 * 60 * 1000);
            axios
                .post(process.env.N8N_DOSE_REMINDER_WEBHOOK, {
                patientName: appointment.userData?.name,
                patientEmail: appointment.userData?.email,
                medicineName: medicine.name,
                dosagePerDay: medicine.dosagePerDay,
                nextDoseTime: nextDoseTime.toISOString(),
                reminderAt30: reminderAt30.toISOString(),
                reminderAt5: reminderAt5.toISOString(),
                remainingQuantity: medicine.remainingQuantity,
                appointmentId: appointment._id.toString(),
                userId: appointment.userId.toString(),
            })
                .catch((err) => console.warn("n8n dose reminder failed:", err.message));
        }
        res.status(200).json({
            success: true,
            message: "Dose logged successfully",
            remaining: medicine.remainingQuantity,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// --- PAYMENTS ---
const paymentStripe = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData || appointmentData.cancelled)
            return res
                .status(400)
                .json({ success: false, message: "Invalid appointment" });
        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${process.env.USER_URL}/verify?success=true&appointmentId=${appointmentId}`,
            cancel_url: `${process.env.USER_URL}/verify?success=false&appointmentId=${appointmentId}`,
            line_items: [
                {
                    price_data: {
                        currency: process.env.CURRENCY || "usd",
                        product_data: {
                            name: `Appointment with ${appointmentData.docData.name}`,
                        },
                        unit_amount: appointmentData.amount * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
        });
        res.status(200).json({ success: true, session_url: session.url });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//Stripe payment verification
const verifyStripe = async (req, res) => {
    try {
        const { appointmentId, success } = req.body;
        if (success === "true") {
            await appointmentModel.findByIdAndUpdate(appointmentId, {
                payment: true,
            });
            res.status(200).json({ success: true, message: "Payment Successful" });
        }
        else {
            res.status(400).json({ success: false, message: "Payment Failed" });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// --- SECURITY & ACCOUNT --- Changing Passowrd -----------
const changePassword = async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        const user = await userModel.findById(userId);
        if (!user)
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch)
            return res
                .status(401)
                .json({ success: false, message: "Incorrect current password" });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.status(200).json({ success: true, message: "Password updated" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// --- SECURITY & ACCOUNT --- Forgot Passowrd -----------
const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email ? req.body.email.toLowerCase().trim() : "";
        const user = await userModel.findOne({ email });
        if (!user)
            return res
                .status(404)
                .json({ success: false, message: "Email not found" });
        const token = crypto.randomBytes(40).toString("hex");
        user.resetToken = token;
        user.resetTokenExpire = Date.now() + 15 * 60 * 1000;
        await user.save();
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: "Reset Password",
            html: `<a href="${process.env.CLIENT_URL}/reset-password/${token}">Reset Link</a>`,
        });
        res.status(200).json({ success: true, message: "Reset link sent" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// --- SECURITY & ACCOUNT --- Reset Passowrd -----------
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const user = await userModel.findOne({
            resetToken: token,
            resetTokenExpire: { $gt: Date.now() },
        });
        if (!user)
            return res
                .status(400)
                .json({ success: false, message: "Invalid/Expired token" });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetToken = "";
        user.resetTokenExpire = 0;
        await user.save();
        res
            .status(200)
            .json({ success: true, message: "Password reset successful" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const deleteAccount = async (req, res) => {
    try {
        const { userId } = req.body;
        await userModel.findByIdAndDelete(userId);
        await appointmentModel.deleteMany({ userId });
        res
            .status(200)
            .json({ success: true, message: "Account permanently deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentStripe, verifyStripe, updateMedicationDose, googleAuth, changePassword, deleteAccount, forgotPassword, resetPassword, };
//# sourceMappingURL=userController.js.map