import jwt from 'jsonwebtoken';
import {} from 'express';
//user authentication middleware
const authUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "unauthorized user, Login again" });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not Authorized Login Again' });
        }
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        if (!req.body) {
            req.body = {};
        }
        console.log("--- MIDDLEWARE AUTH --- User ID:", token_decode.id);
        req.body.userId = token_decode.id;
        req.userId = token_decode.id;
        next();
    }
    catch (error) {
        console.log("User Auth Error:", error);
        res.status(401).json({ success: false, message: error.message });
    }
};
export default authUser;
//# sourceMappingURL=authUser.js.map