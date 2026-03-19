import express from 'express'
import { bookAppointment, cancelAppointment, getProfile, listAppointment, loginUser, paymentStripe, registerUser, updateProfile, verifyStripe } from '../controllers/userController.js'
import authUser from '../middlewares/authUser.js';
import upload from '../middlewares/multer.js';


const userRoute = express.Router();

userRoute.post('/register', registerUser)
userRoute.post('/login', loginUser)
userRoute.get('/get-profile', authUser, getProfile)
userRoute.post('/update-profile', authUser, upload.single('image'), updateProfile)
userRoute.post('/book-appointment', authUser, bookAppointment)
userRoute.get('/appointments', authUser, listAppointment)
userRoute.post('/cancel-appointment', authUser, cancelAppointment)
userRoute.post('/payment-stripe', authUser, paymentStripe)
userRoute.post('/verify-stripe', authUser, verifyStripe)

export default userRoute