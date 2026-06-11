import mongoose from "mongoose";
const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error(" MongoDB Error: MONGODB_URI is not defined in .env");
        process.exit(1);
    }
    try {
        mongoose.connection.on('connected', () => console.log("Database Connected "));
        mongoose.connection.on('error', (err) => {
            console.error(`MongoDB: Connection error: ${err.message}`);
        });
        mongoose.connection.on('disconnected', () => {
            console.warn("MongoDB: Connection lost. Attempting to reconnect...");
        });
        await mongoose.connect(`${uri}/prescripto`);
        // Self-healing migration: lowercase all existing user and doctor emails
        try {
            const userModel = mongoose.models.user || mongoose.model('user');
            const doctorModel = mongoose.models.doctor || mongoose.model('doctor');
            const users = await userModel.find({ email: { $regex: /[A-Z]/ } });
            if (users.length > 0) {
                console.log(`[Migration] Found ${users.length} users with uppercase characters in emails. Normalizing...`);
                for (const user of users) {
                    const normalized = user.email.toLowerCase().trim();
                    const exists = await userModel.findOne({ email: normalized });
                    if (!exists) {
                        user.email = normalized;
                        await user.save();
                    }
                    else {
                        console.warn(`[Migration] Collision: user email ${normalized} already exists. Skipping.`);
                    }
                }
            }
            const doctors = await doctorModel.find({ email: { $regex: /[A-Z]/ } });
            if (doctors.length > 0) {
                console.log(`[Migration] Found ${doctors.length} doctors with uppercase characters in emails. Normalizing...`);
                for (const doctor of doctors) {
                    const normalized = doctor.email.toLowerCase().trim();
                    const exists = await doctorModel.findOne({ email: normalized });
                    if (!exists) {
                        doctor.email = normalized;
                        await doctor.save();
                    }
                    else {
                        console.warn(`[Migration] Collision: doctor email ${normalized} already exists. Skipping.`);
                    }
                }
            }
        }
        catch (migErr) {
            console.error("[Migration] Error executing startup normalization:", migErr.message);
        }
    }
    catch (error) {
        console.error("ErrorConnecting  to MongoDB", error);
        process.exit(1);
    }
};
export default connectDB;
//# sourceMappingURL=mongodb.js.map