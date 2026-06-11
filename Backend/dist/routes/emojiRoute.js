import express, { Router } from "express";
import { sendEmojiPing, getUndeliveredPings, } from "../controllers/emojiController.js";
import authUser from "../middlewares/authUser.js";
const emojiRouter = express.Router();
emojiRouter.post("/send", authUser, sendEmojiPing);
emojiRouter.get("/undelivered", authUser, getUndeliveredPings);
export default emojiRouter;
//# sourceMappingURL=emojiRoute.js.map