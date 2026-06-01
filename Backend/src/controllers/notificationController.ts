import { type Request, type Response } from "express";
import notificationModel from "../models/notificationModel.js";

const createNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, message, type } = req.body;
    if (!userId || !title || !message)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    const notification = await new notificationModel({
      userId,
      title,
      message,
      type: type || "general",
    }).save();

    res.status(201).json({ success: true, notification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const notifications = await notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    await notificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );
    res.status(200).json({ success: true, message: "All marked as read" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markOneRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.body;
    await notificationModel.findByIdAndUpdate(notificationId, { isRead: true });
    res.status(200).json({ success: true, message: "Marked as read" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearAll = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    await notificationModel.deleteMany({ userId });
    res.status(200).json({ success: true, message: "Cleared" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  createNotification,
  getNotifications,
  markAllRead,
  markOneRead,
  clearAll,
};
