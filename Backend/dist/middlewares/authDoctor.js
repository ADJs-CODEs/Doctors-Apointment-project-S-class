import jwt from 'jsonwebtoken';
import {} from 'express';
const authDoctor = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: "unauthorized user, Login again" });
        }
        const dtoken = authHeader.split(" ")[1];
        const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);
        req.docId = token_decode.id;
        next();
    }
    catch (error) {
        console.log("Doctor Auth Error", error);
        res.status(401).json({ success: false, message: error.message });
    }
};
export default authDoctor;
//# sourceMappingURL=authDoctor.js.map