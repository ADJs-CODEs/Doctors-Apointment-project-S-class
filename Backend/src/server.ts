import 'dotenv/config';
console.log("file is running")
import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRoute from './routes/userRoute.js';


// app config

const app: Application = express();
const port: string | number = process.env.PORT || 4000

// External connections 
connectDB()
connectCloudinary()


// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use('/api/admin', adminRouter) //endpoints for admin
app.use('/api/doctor', doctorRouter) //endpoints for doctor
app.use('/api/user', userRoute)  //endpoints for user



// localhost:4000/api/admin/add-doctor
app.get('/', (req: Request, res: Response) => {
  res.send('API is fully WORKING')
})

//Testing the route
app.get('/test', (req: Request, res: Response) => res.send("Test Route Works"));

app.listen(port, () => console.log("Server Started", port))

