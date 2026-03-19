import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from '../models/userModel.js'
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary'
import doctorModel from '../models/doctorsModel.js'
import appointmentModel from '../models/appointmentModel.js'
import stripe from 'stripe'






//API to register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.json({ success: false, message: 'missing details' })
    }

    //validating email format

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: 'enter a valid email' })
    }

    // validating user password

    if (password.length < 8) {

      return res.json({ success: false, message: 'enter a strong password' })
    }

    //hashing user password

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const userData = {
      name,
      email,
      password: hashedPassword

    }
    const newUser = new userModel(userData)
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

    res.json({ success: true, token })


  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
//API for usser Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await userModel.findOne({ email })

    if (!user) {
      return res.json({ success: false, message: 'user does not exist, login again' })
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
      res.json({ success: true, token })
    } else {
      res.json({ success: false, message: 'invalid credential' })
    }
  }
  catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })

  }


}

//API to get user profile data
const getProfile = async (req, res) => {
  try {
    const { userId } = req.body
    const userData = await userModel.findById(userId).select('-password')

    res.json({
      success: true, userData
    })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

//API to update user Profile
const updateProfile = async (req, res) => {
  try {
    const { userId, name, phone, address, dob, gender, } = req.body
    const imageFile = req.file


    if (!name || !phone || !address || !dob || !gender) {
      return res.json({ success: false, message: 'Data Missing' })
    }

    await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

    if (imageFile) {
      // upload image to cloudinary
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' })
      const imageURL = imageUpload.secure_url
      await userModel.findByIdAndUpdate(userId, { image: imageURL })

    }
    res.json({ success: true, message: "Profile Updated" })
  } catch (error) {
    console.log(error)
    res.json({
      success: false, message: error.message
    })
  }
}

//API to book appointment
const bookAppointment = async (req, res) => {
  try {
    const { userId, docId, slotDate, slotTime } = req.body

    const docData = await doctorModel.findById(docId).select('-password')

    if (!docData.available) {
      return res.json({ success: false, message: 'Doctor not available' })
    }
    let slots_booked = docData.slots_booked

    //checking for slot availabilty
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: 'Slot not available' })
      } else {
        slots_booked[slotDate].push(slotTime)
      }
    } else {
      slots_booked[slotDate] = []
      slots_booked[slotDate].push(slotTime)
    }

    const userData = await userModel.findById(userId).select('-password')

    delete docData.slots_booked

    const appointmentData = {
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now()

    }

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save()

    // save new slots data in docData
    await doctorModel.findByIdAndUpdate(docId, { slots_booked })

    res.json({ success: true, message: 'Appointment Booked' })


  } catch (error) {
    console.log(error)
    res.json({
      success: false, message: error.message
    })
  }

}

//API to get user appointment for frontend

const listAppointment = async (req, res) => {
  try {
    const { userId } = req.body
    const appointments = await appointmentModel.find({ userId })

    res.json({ success: true, appointments })
  } catch (error) {
    console.log(error)
    res.json({
      success: false, message: error.message
    })
  }
}

//API to cancel appoinment

const cancelAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body

    const appointmentData = await appointmentModel.findById(appointmentId)

    // verify appointment user
    if (appointmentData.userId.toString() !== userId) {
      return res.json({ success: false, message: 'Unauthorized action' })
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
    //releasing   doctor slot
    const { docId, slotTime, slotDate } = appointmentData
    const doctorData = await doctorModel.findById(docId)

    const slots_booked = doctorData.slots_booked
    slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)

    await doctorModel.findByIdAndUpdate(docId, { slots_booked })
    res.json({ success: true, message: 'Appointment Canceled' })

  } catch (error) {
    console.log(error)
    res.json({
      success: false, message: error.message
    })
  }
}


//API to make payment of appointment using razorpay 
const paymentStripe = async (req, res) => {
  try {
    const { appointmentId } = req.body
    const appointmentData = await appointmentModel.findById(appointmentId)

    if (!appointmentData || appointmentData.cancelled) {
      return res.json({ success: false, message: "Appointment cancelled or not found" })
    }

    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)

    // Creating Stripe Checkout Session
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${process.env.CLIENT_URL}/verify?success=true&appointmentId=${appointmentId}`,
      cancel_url: `${process.env.CLIENT_URL}/verify?success=false&appointmentId=${appointmentId}`,
      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY || 'usd',
            product_data: {
              name: `Appointment with ${appointmentData.docData.name}`
            },
            unit_amount: appointmentData.amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
    })

    res.json({ success: true, session_url: session.url })

  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }

}

const verifyStripe = async (req, res) => {
  try {
    const { appointmentId, success } = req.body;

    if (success === "true") {
      await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true });
      res.json({ success: true, message: "Payment Successful" });
    } else {
      res.json({ success: false, message: "Payment Failed" });
    }

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}
export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentStripe, verifyStripe }