import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(" MongoDB Error: MONGODB_URI is not defined in .env");
    process.exit(1);
  }
  try {
    mongoose.connection.on('connected', () => console.log("Database Connected "))

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB: Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn("MongoDB: Connection lost. Attempting to reconnect...");
    });

    await mongoose.connect(`${uri}/prescripto`)
  } catch (error) {
    console.error("ErrorConnecting  to MongoDB", error);
    process.exit(1);
  }

}

export default connectDB;