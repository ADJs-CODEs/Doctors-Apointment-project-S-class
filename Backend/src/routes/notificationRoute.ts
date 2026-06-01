import express, { Router } from "express";
import {
  createNotification,
  getNotifications,
  markAllRead,
  markOneRead,
  clearAll,
} from "../controllers/notificationController.js";
import authUser from "../middlewares/authUser.js";

const notificationRouter: Router = express.Router();

notificationRouter.post("/create", createNotification);
notificationRouter.get("/get", authUser, getNotifications);
notificationRouter.post("/mark-all-read", authUser, markAllRead);
notificationRouter.post("/mark-one-read", authUser, markOneRead);
notificationRouter.post("/clear", authUser, clearAll);

export default notificationRouter;
