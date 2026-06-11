import { v2 as cloudinary } from 'cloudinary';
const connectCloudinary = async () => {
    if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error("Cloudinary Error: Environment variables are missing.");
        return;
    }
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
};
export default connectCloudinary;
//# sourceMappingURL=cloudinary.js.map