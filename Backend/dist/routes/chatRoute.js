import express, { Router } from "express";
import { chatWithGemini, chatWithGeminiDoctor, } from "../controllers/chatController.js";
import authUser from "../middlewares/authUser.js";
import authDoctor from "../middlewares/authDoctor.js";
const chatRouter = express.Router();
chatRouter.post("/doctor-message", authDoctor, chatWithGeminiDoctor);
chatRouter.post("/message", authUser, chatWithGemini);
export default chatRouter;
//# sourceMappingURL=chatRoute.js.map