import 'dotenv/config';
console.log("file is running")
import express from 'express';
import cors from 'cors';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRoute from './routes/userRoute.js';


// app config

const app = express();
const port = process.env.PORT || 4000

connectDB()
connectCloudinary()


// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use('/api/admin', adminRouter)
app.use('/api/doctor', doctorRouter)

//api endpoints for user
app.use('/api/user', userRoute)
// localhost:4000/api/admin/add-doctor
app.get('/', (req, res) => {
  res.send('API is fully WORKING')
})

app.get('/test', (req, res) => res.send("Test Route Works"));

app.listen(port, () => console.log("Server Started", port))

