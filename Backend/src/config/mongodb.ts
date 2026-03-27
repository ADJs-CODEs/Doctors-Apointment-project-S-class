import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(" MongoDB Error: MONGODB_URI is not defined in .env");
    process.exit(1);
  }

  mongoose.connection.on('connected', () => console.log("Database Connected "))

  await mongoose.connect(`${uri}/prescripto`)
}

export default connectDB;