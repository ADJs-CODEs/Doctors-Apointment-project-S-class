import { type Request, type Response } from "express";
import emojiPingModel from "../models/emojiPingModel.js";
import userModel from "../models/userModel.js";
import connectionModel from "../models/connectionModels.js";
import { sendEmojiToUser } from "../server.js";

const VALID_EMOJIS = ["❤️", "🌸", "👏", "⭐", "🙏"];

const sendEmojiPing = async (req: Request, res: Response) => {
  try {
    const fromUserId = (req as any).userId;
    const { toUserId, emoji } = req.body;

    if (!toUserId || !emoji)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    const VALID_EMOJIS = ["❤️", "🌸", "👏", "⭐", "🙏"];
    if (!VALID_EMOJIS.includes(emoji))
      return res.status(400).json({ success: false, message: "Invalid emoji" });

    // Fix: use flexible connection check — either direction
    const connection = await connectionModel.findOne({
      $or: [
        { requesterId: fromUserId, patientId: toUserId, status: "accepted" },
        { requesterId: toUserId, patientId: fromUserId, status: "accepted" },
      ],
    });

    if (!connection)
      return res
        .status(403)
        .json({
          success: false,
          message: "No active connection with this user",
        });

    const fromUser = await userModel.findById(fromUserId).select("name");

    const ping = await new emojiPingModel({
      fromUserId,
      toUserId,
      emoji,
      fromName: fromUser?.name || "Someone",
      delivered: false,
    }).save();

    const delivered = sendEmojiToUser(toUserId, {
      pingId: ping._id,
      emoji,
      fromName: fromUser?.name || "Someone",
      fromUserId,
    });

    if (delivered) {
      await emojiPingModel.findByIdAndUpdate(ping._id, { delivered: true });
    }

    res.status(201).json({ success: true, message: "Emoji sent", delivered });
  } catch (error: any) {
    console.error("Emoji send error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// Get undelivered pings for a user (for when they come back online)
const getUndeliveredPings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const pings = await emojiPingModel
      .find({ toUserId: userId, delivered: false })
      .sort({ createdAt: -1 })
      .limit(20);

    // Mark as delivered
    await emojiPingModel.updateMany(
      { toUserId: userId, delivered: false },
      { delivered: true },
    );

    res.status(200).json({ success: true, pings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { sendEmojiPing, getUndeliveredPings };
