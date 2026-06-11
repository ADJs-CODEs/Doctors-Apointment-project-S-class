import express, { Router } from "express";
import { nominatePatient, giveConsent, getWishWell, sendWishWellEmoji, updatePatientStatus, removeFromWishWell, optOut, getPendingConsent, } from "../controllers/wishWellController.js";
import authUser from "../middlewares/authUser.js";
import authDoctor from "../middlewares/authDoctor.js";
const wishWellRouter = express.Router();
// Public
wishWellRouter.get("/all", getWishWell);
// Patient routes
wishWellRouter.post("/consent", authUser, giveConsent);
wishWellRouter.post("/opt-out", authUser, optOut);
wishWellRouter.get("/pending-consent", authUser, getPendingConsent);
// Doctor routes
wishWellRouter.post("/nominate", authDoctor, nominatePatient);
wishWellRouter.post("/update-status", authDoctor, updatePatientStatus);
wishWellRouter.post("/remove", authDoctor, removeFromWishWell);
// Any logged in user
wishWellRouter.post("/send-emoji", authUser, sendWishWellEmoji);
export default wishWellRouter;
//# sourceMappingURL=wishWellRoute.js.map