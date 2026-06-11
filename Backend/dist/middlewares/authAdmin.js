import jwt from 'jsonwebtoken';
import {} from 'express';
//admin authentication middleware
const authAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: "Not Authorized.Login Again" });
        }
        const atoken = authHeader.split(" ")[1];
        const token_decode = jwt.verify(atoken, process.env.JWT_SECRET);
        if (token_decode !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: 'Not Authorized Login Again' });
        }
        next();
    }
    catch (error) {
        console.log("Auth Error:", error);
        res.status(401).json({ success: false, message: error.message });
    }
};
export default authAdmin;
//# sourceMappingURL=authAdmin.js.map