import express, { Router } from "express";
import { chatWithGemini } from "../controllers/chatController.js";
import authUser from "../middlewares/authUser.js";

const chatRouter: Router = express.Router();

chatRouter.post("/message", authUser, chatWithGemini);

export default chatRouter;
