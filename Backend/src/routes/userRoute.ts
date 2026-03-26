import express, { Router } from 'express'
import { bookAppointment, cancelAppointment, changePassword, deleteAccount, forgotPassword, getProfile, googleAuth, listAppointment, loginUser, paymentStripe, registerUser, resetPassword, updateMedicationDose, updateProfile, verifyStripe } from '../controllers/userController.js'
import authUser from '../middlewares/authUser.js';
import upload from '../middlewares/multer.js';


const userRoute: Router = express.Router();

//My Public Routes
userRoute.post('/register', registerUser)
userRoute.post('/login', loginUser)


userRoute.get('/get-profile', authUser, getProfile)
userRoute.post('/update-profile', authUser, upload.single('image'), updateProfile)

//Appointment system
userRoute.post('/book-appointment', authUser, bookAppointment)
userRoute.get('/appointments', authUser, listAppointment)
userRoute.post('/cancel-appointment', authUser, cancelAppointment)

//Stripe Payment
userRoute.post('/payment-stripe', authUser, paymentStripe)
userRoute.post('/verify-stripe', authUser, verifyStripe)

//Appointment traciking
userRoute.post('/update-dose', authUser, updateMedicationDose)

//Google login and Authentication 
userRoute.post('/google-auth', googleAuth)
//Api to delete and change users password
userRoute.post('/change-password', authUser, changePassword)
userRoute.post('/delete-account', authUser, deleteAccount)
//Api to reset password 
userRoute.post('/forgot-password', forgotPassword)
userRoute.post('/reset-password', resetPassword)

export default userRoute