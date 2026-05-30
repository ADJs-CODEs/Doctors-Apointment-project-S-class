import { type Request, type Response } from "express";
import connectionModel from "../models/connectionModel.js";
import userModel from "../models/userModel.js";
import appointmentModel from "../models/appointmentModel.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// --- SEND A CONNECTION REQUEST ---
const sendConnectionRequest = async (req: Request, res: Response) => {
  try {
    const requesterId = (req as any).userId;
    const { patientEmail } = req.body;

    if (!patientEmail)
      return res
        .status(400)
        .json({ success: false, message: "Patient email required" });

    // Find the patient by email
    const patient = await userModel.findOne({ email: patientEmail });
    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: "No user found with that email" });

    // Can't connect to yourself
    if (patient._id.toString() === requesterId)
      return res
        .status(400)
        .json({ success: false, message: "You can't connect to yourself" });

    // Check if connection already exists
    const existing = await connectionModel.findOne({
      requesterId,
      patientId: patient._id.toString(),
    });
    if (existing) {
      if (existing.status === "pending")
        return res
          .status(400)
          .json({ success: false, message: "Request already sent" });
      if (existing.status === "accepted")
        return res
          .status(400)
          .json({ success: false, message: "Already connected" });
      // If rejected, allow re-request by updating status
      if (existing.status === "rejected") {
        existing.status = "pending";
        await existing.save();
        return res
          .status(200)
          .json({ success: true, message: "Connection request re-sent" });
      }
    }

    // Get requester info for the email
    const requester = await userModel
      .findById(requesterId)
      .select("name email");

    // Create connection
    await new connectionModel({
      requesterId,
      patientId: patient._id.toString(),
    }).save();

    // Notify patient by email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: patient.email,
      subject: `${requester?.name} wants to watch over you on ADJ's CODEs`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <div style="background:#0f172a;padding:20px;border-radius:16px;text-align:center;margin-bottom:24px">
            <span style="color:#2dd4bf;font-size:28px;font-weight:900">+</span>
            <span style="color:white;font-weight:900;font-size:16px;margin-left:8px;text-transform:uppercase;letter-spacing:2px">ADJ's CODEs</span>
          </div>
          <h2 style="color:#0f172a;font-size:22px;font-weight:900">Care Connection Request</h2>
          <p style="color:#64748b"><strong>${requester?.name}</strong> (${requester?.email}) has sent you a request to monitor your health activity on ADJ's CODEs.</p>
          <p style="color:#64748b">Log in to your account to accept or reject this request.</p>
          <a href="${process.env.CLIENT_URL}/my-profile" style="display:inline-block;background:#0f172a;color:white;padding:14px 28px;border-radius:12px;font-weight:900;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-top:8px">Review Request</a>
        </div>
      `,
    });

    res.status(201).json({ success: true, message: "Connection request sent" });
  } catch (error: any) {
    if (error.code === 11000)
      return res
        .status(400)
        .json({ success: false, message: "Request already exists" });
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- RESPOND TO A REQUEST (accept or reject) ---
const respondToRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { connectionId, action } = req.body;

    if (!["accepted", "rejected"].includes(action))
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });

    const connection = await connectionModel.findById(connectionId);
    if (!connection)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });

    // Only the patient can respond
    if (connection.patientId !== userId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    connection.status = action;
    await connection.save();

    // Notify the requester of the outcome
    const requester = await userModel
      .findById(connection.requesterId)
      .select("email name");
    const patient = await userModel.findById(userId).select("name");

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: requester?.email,
      subject: `${patient?.name} ${action} your care connection request`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <div style="background:#0f172a;padding:20px;border-radius:16px;text-align:center;margin-bottom:24px">
            <span style="color:#2dd4bf;font-size:28px;font-weight:900">+</span>
            <span style="color:white;font-weight:900;font-size:16px;margin-left:8px;text-transform:uppercase;letter-spacing:2px">ADJ's CODEs</span>
          </div>
          <h2 style="color:#0f172a;font-size:22px;font-weight:900">Connection ${action === "accepted" ? "Accepted ✓" : "Declined"}</h2>
          <p style="color:#64748b"><strong>${patient?.name}</strong> has ${action} your care connection request.</p>
          ${
            action === "accepted"
              ? `<a href="${process.env.CLIENT_URL}/watching-over" style="display:inline-block;background:#0d9488;color:white;padding:14px 28px;border-radius:12px;font-weight:900;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-top:8px">View Their Dashboard</a>`
              : ""
          }
        </div>
      `,
    });

    res.status(200).json({ success: true, message: `Request ${action}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- GET ALL PENDING REQUESTS FOR THE LOGGED IN USER ---
const getMyRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const pending = await connectionModel.find({
      patientId: userId,
      status: "pending",
    });

    // Attach requester info to each request
    const enriched = await Promise.all(
      pending.map(async (conn) => {
        const requester = await userModel
          .findById(conn.requesterId)
          .select("name email image");
        return { ...conn.toObject(), requester };
      }),
    );

    res.status(200).json({ success: true, requests: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- GET EVERYONE I AM WATCHING OVER ---
const getWatchingOver = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const connections = await connectionModel.find({
      requesterId: userId,
      status: "accepted",
    });

    const enriched = await Promise.all(
      connections.map(async (conn) => {
        const patient = await userModel
          .findById(conn.patientId)
          .select("name email image phone");
        return { ...conn.toObject(), patient };
      }),
    );

    res.status(200).json({ success: true, watching: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- GET EVERYONE WATCHING OVER ME ---
const getMyWatchers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const connections = await connectionModel.find({
      patientId: userId,
      status: "accepted",
    });

    const enriched = await Promise.all(
      connections.map(async (conn) => {
        const watcher = await userModel
          .findById(conn.requesterId)
          .select("name email image");
        return { ...conn.toObject(), watcher };
      }),
    );

    res.status(200).json({ success: true, watchers: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- REMOVE A CONNECTION ---
const removeConnection = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { connectionId } = req.body;

    const connection = await connectionModel.findById(connectionId);
    if (!connection)
      return res
        .status(404)
        .json({ success: false, message: "Connection not found" });

    // Either the patient OR the watcher can remove
    if (connection.patientId !== userId && connection.requesterId !== userId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    await connectionModel.findByIdAndDelete(connectionId);
    res.status(200).json({ success: true, message: "Connection removed" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- VIEW A WATCHED PATIENT'S FULL DATA (read only) ---
const getPatientData = async (req: Request, res: Response) => {
  try {
    const watcherId = (req as any).userId;
    const { patientId } = req.params;

    // Verify an accepted connection exists
    const connection = await connectionModel.findOne({
      requesterId: watcherId,
      patientId,
      status: "accepted",
    });

    if (!connection)
      return res
        .status(403)
        .json({
          success: false,
          message: "No active connection with this patient",
        });

    // Fetch patient data
    const [patient, appointments] = await Promise.all([
      userModel.findById(patientId).select("-password"),
      appointmentModel.find({ userId: patientId }).sort({ date: -1 }),
    ]);

    res.status(200).json({ success: true, patient, appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  sendConnectionRequest,
  respondToRequest,
  getMyRequests,
  getWatchingOver,
  getMyWatchers,
  removeConnection,
  getPatientData,
};
