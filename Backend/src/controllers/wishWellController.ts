import { type Request, type Response } from "express";
import wishWellModel from "../models/wishWellModel.js";
import userModel from "../models/userModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { sendEmojiToUser } from "../server.js";

// Doctor nominates a patient
const nominatePatient = async (req: Request, res: Response) => {
  try {
    const docId = (req as any).docId;
    const { patientId, condition, story } = req.body;

    if (!patientId || !condition || !story)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    // Check patient exists
    const patient = await userModel.findById(patientId).select("name image");
    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });

    // Check not already listed
    const existing = await wishWellModel.findOne({
      patientId,
      status: "critical",
    });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Patient already on the Wish Well" });

    // Get doctor info from appointment
    const appointment = await appointmentModel.findOne({
      docId,
      userId: patientId,
    });
    const doctorName = appointment?.docData?.name || "Doctor";

    const entry = await new wishWellModel({
      patientId,
      patientName: patient.name,
      patientImage: patient.image,
      doctorId: docId,
      doctorName,
      condition,
      story,
      consentGiven: false, // Patient must accept first
    }).save();

    res
      .status(201)
      .json({
        success: true,
        message: "Nomination sent — awaiting patient consent",
        entry,
      });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Patient gives consent
const giveConsent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { entryId, accept } = req.body;

    const entry = await wishWellModel.findById(entryId);
    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });

    if (entry.patientId !== userId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    if (!accept) {
      await wishWellModel.findByIdAndDelete(entryId);
      return res.status(200).json({ success: true, message: "Declined" });
    }

    entry.consentGiven = true;
    await entry.save();

    res.status(200).json({ success: true, message: "Added to Wish Well" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all active wish well entries (public)
const getWishWell = async (req: Request, res: Response) => {
  try {
    const entries = await wishWellModel
      .find({ consentGiven: true, optedOut: false })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, entries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send emoji to a wish well patient
const sendWishWellEmoji = async (req: Request, res: Response) => {
  try {
    const { entryId, emoji } = req.body;

    const VALID_EMOJIS = ["❤️", "🌸", "👏", "⭐", "🙏"];
    if (!VALID_EMOJIS.includes(emoji))
      return res.status(400).json({ success: false, message: "Invalid emoji" });

    const entry = await wishWellModel.findById(entryId);
    if (!entry || !entry.consentGiven || entry.optedOut)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });

    if (entry.status !== "critical")
      return res
        .status(400)
        .json({
          success: false,
          message: "Patient has been updated — emojis disabled",
        });

    // Update counts
    const emojiMap: Record<string, string> = {
      "❤️": "heart",
      "🌸": "flower",
      "👏": "clap",
      "⭐": "star",
      "🙏": "prayer",
    };

    const key = emojiMap[emoji];
    if (key) {
      await wishWellModel.findByIdAndUpdate(entryId, {
        $inc: {
          [`emojiCounts.${key}`]: 1,
          totalEmojis: 1,
        },
      });
    }

    // Send real-time to patient
    sendEmojiToUser(entry.patientId, {
      emoji,
      fromName: "The Community",
      isWishWell: true,
    });

    res.status(200).json({ success: true, message: "Emoji sent" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Doctor updates patient status
const updatePatientStatus = async (req: Request, res: Response) => {
  try {
    const docId = (req as any).docId;
    const { entryId, status } = req.body;

    if (!["recovered", "passed"].includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });

    const entry = await wishWellModel.findById(entryId);
    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });

    if (entry.doctorId !== docId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    entry.status = status;
    await entry.save();

    // If recovered, send congratulations emoji to patient
    if (status === "recovered") {
      sendEmojiToUser(entry.patientId, {
        emoji: "🎉",
        fromName: "ADJ's CODEs",
        isCongratulations: true,
        message:
          "Your doctor has marked you as recovered! The community celebrates with you.",
      });
    }

    res
      .status(200)
      .json({ success: true, message: `Status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Doctor removes patient from wish well
const removeFromWishWell = async (req: Request, res: Response) => {
  try {
    const docId = (req as any).docId;
    const { entryId } = req.body;

    const entry = await wishWellModel.findById(entryId);
    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });

    if (entry.doctorId !== docId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    await wishWellModel.findByIdAndDelete(entryId);
    res.status(200).json({ success: true, message: "Removed from Wish Well" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Patient opts out
const optOut = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    await wishWellModel.updateMany({ patientId: userId }, { optedOut: true });

    res.status(200).json({ success: true, message: "Opted out successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get pending consent requests for patient
const getPendingConsent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const pending = await wishWellModel.find({
      patientId: userId,
      consentGiven: false,
      optedOut: false,
    });

    res.status(200).json({ success: true, pending });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  nominatePatient,
  giveConsent,
  getWishWell,
  sendWishWellEmoji,
  updatePatientStatus,
  removeFromWishWell,
  optOut,
  getPendingConsent,
};
