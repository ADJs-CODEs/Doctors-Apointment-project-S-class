import { type Request, type Response } from "express";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";

const chatWithGemini = async (req: Request, res: Response) => {
  console.log("GEMINI KEY present?", !!process.env.GEMINI_API_KEY);
  try {
    const userId = (req as any).userId;
    const { message, history } = req.body;

    if (!message)
      return res
        .status(400)
        .json({ success: false, message: "Message required" });

    // Fetch patient context from DB
    const [user, appointments] = await Promise.all([
      userModel.findById(userId).select("-password"),
      appointmentModel.find({ userId }).sort({ date: -1 }).limit(5),
    ]);

    // Build context summary
    const upcomingAppointments = appointments
      .filter((a) => !a.isCompleted && !a.cancelled)
      .map(
        (a) =>
          `- Doctor: ${a.docData?.name} (${a.docData?.speciality}), Date: ${a.slotDate.replace(/_/g, "/")}, Time: ${a.slotTime}, Paid: ${a.payment ? "Yes" : "No"}`,
      )
      .join("\n");

    const activeMeds = appointments
      .filter((a) => a.isCompleted && a.healthData?.prescribedMedicines?.length)
      .flatMap((a) =>
        a.healthData.prescribedMedicines
          .filter((m: any) => m.remainingQuantity > 0)
          .map(
            (m: any) =>
              `- ${m.name}: ${m.dosagePerDay} dose(s)/day, ${m.remainingQuantity} remaining`,
          ),
      )
      .join("\n");

    const latestVitals = appointments.find(
      (a) => a.healthData?.heartRate && a.healthData.heartRate !== "",
    );
    const vitals = latestVitals
      ? `Heart rate: ${latestVitals.healthData.heartRate} BPM, Blood pressure: ${latestVitals.healthData.bloodPressure}, Temperature: ${latestVitals.healthData.temperature}°C`
      : "No vitals recorded yet";

    const systemPrompt = `You are a helpful medical assistant for ADJ's CODEs Pharmaceutical, a digital healthcare platform based in Lagos, Nigeria.

You are speaking with ${user?.name || "a patient"}.

Here is their current medical context:

UPCOMING APPOINTMENTS:
${upcomingAppointments || "No upcoming appointments"}

ACTIVE MEDICATIONS:
${activeMeds || "No active medications"}

LATEST VITALS:
${vitals}

IMPORTANT RULES:
- You can answer questions about their appointments, medications, dosage schedules, and vitals
- For general medical questions, give helpful but careful advice and always recommend consulting their doctor
- Never diagnose conditions or recommend changing prescribed medications
- Keep responses concise and friendly
- If asked about something outside medical/health topics, politely redirect
- Always refer to the patient by their first name: ${user?.name?.split(" ")[0] || "there"}
- You are NOT a replacement for professional medical advice`;

    // Build Gemini request
    const geminiHistory = (history || []).map((h: any) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    }));

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...geminiHistory,
            { role: "user", parts: [{ text: message }] },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          },
        }),
      },
    );

    const geminiData = (await geminiRes.json()) as any;

    if (!geminiRes.ok) {
      console.error("Gemini error:", geminiData);
      return res
        .status(500)
        .json({ success: false, message: "Gemini API error" });
    }

    const reply =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I could not generate a response.";

    res.status(200).json({ success: true, reply });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export { chatWithGemini };
