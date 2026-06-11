import {} from "express";
import notificationModel from "../models/notificationModel.js";
const createNotification = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const getNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        const notifications = await notificationModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(20);
        res.status(200).json({ success: true, notifications });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const markAllRead = async (req, res) => {
    try {
        const userId = req.userId;
        await notificationModel.updateMany({ userId, isRead: false }, { isRead: true });
        res.status(200).json({ success: true, message: "All marked as read" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const markOneRead = async (req, res) => {
    try {
        const { notificationId } = req.body;
        await notificationModel.findByIdAndUpdate(notificationId, { isRead: true });
        res.status(200).json({ success: true, message: "Marked as read" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const clearAll = async (req, res) => {
    try {
        const userId = req.userId;
        await notificationModel.deleteMany({ userId });
        res.status(200).json({ success: true, message: "Cleared" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export { createNotification, getNotifications, markAllRead, markOneRead, clearAll, };
//# sourceMappingURL=notificationController.js.map