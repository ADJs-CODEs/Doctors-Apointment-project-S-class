import {} from "express";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorsModel.js";
const chatWithGemini = async (req, res) => {
    try {
        const userId = req.userId;
        const { message, history } = req.body;
        if (!message)
            return res
                .status(400)
                .json({ success: false, message: "Message required" });
        const [user, appointments] = await Promise.all([
            userModel.findById(userId).select("-password"),
            appointmentModel.find({ userId }).sort({ date: -1 }).limit(5),
        ]);
        const upcomingAppointments = appointments
            .filter((a) => !a.isCompleted && !a.cancelled)
            .map((a) => `- Doctor: ${a.docData?.name} (${a.docData?.speciality}), Date: ${a.slotDate.replace(/_/g, "/")}, Time: ${a.slotTime}, Paid: ${a.payment ? "Yes" : "No"}`)
            .join("\n");
        const activeMeds = appointments
            .filter((a) => a.isCompleted && a.healthData?.prescribedMedicines?.length)
            .flatMap((a) => a.healthData.prescribedMedicines
            .filter((m) => m.remainingQuantity > 0)
            .map((m) => `- ${m.name}: ${m.dosagePerDay} dose(s)/day, ${m.remainingQuantity} remaining`))
            .join("\n");
        const latestVitals = appointments.find((a) => a.healthData?.heartRate && a.healthData.heartRate !== "");
        const vitals = latestVitals
            ? `Heart rate: ${latestVitals.healthData.heartRate} BPM, Blood pressure: ${latestVitals.healthData.bloodPressure}, Temperature: ${latestVitals.healthData.temperature}°C`
            : "No vitals recorded yet";
        const systemPrompt = `You are a knowledgeable and friendly medical assistant for ADJ's CODEs Pharmaceutical, a digital healthcare platform based in Lagos, Nigeria.

You are speaking with ${user?.name || "a patient"}.

Here is their current medical context:

UPCOMING APPOINTMENTS:
${upcomingAppointments || "No upcoming appointments"}

ACTIVE MEDICATIONS:
${activeMeds || "No active medications"}

LATEST VITALS:
${vitals}

YOUR CAPABILITIES — answer ALL of these freely:
- What any drug is, what it treats, how it works, side effects, interactions
- General medical conditions, symptoms, and what they mean
- Dosage explanations (what once/twice daily means etc.)
- Their personal appointment details, medication schedule, and vitals
- General health advice (diet, hydration, sleep, exercise)
- What medical terms and test results mean

YOUR LIMITS — only avoid these:
- Do NOT diagnose the patient themselves based on symptoms they describe
- Do NOT tell them to change or stop a prescribed medication
- Do NOT give emergency advice — always direct to emergency services for urgent issues

TONE: Warm, clear, and helpful. Never say "I cannot help with that" for general medical questions.
Always refer to the patient by their first name: ${user?.name?.split(" ")[0] || "there"}
You are a helpful assistant, not a gatekeeper.`;
        const geminiHistory = (history || []).map((h) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
        }));
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
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
        });
        const geminiData = (await geminiRes.json());
        if (!geminiRes.ok) {
            console.error("Gemini error:", geminiData);
            return res
                .status(500)
                .json({ success: false, message: "Gemini API error" });
        }
        const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Sorry, I could not generate a response.";
        res.status(200).json({ success: true, reply });
    }
    catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
const chatWithGeminiDoctor = async (req, res) => {
    try {
        const docId = req.docId;
        const { message, history, appointmentContext } = req.body;
        if (!message)
            return res
                .status(400)
                .json({ success: false, message: "Message required" });
        // Build appointment context if provided
        let patientContext = "No specific patient selected.";
        if (appointmentContext) {
            const meds = appointmentContext.healthData?.prescribedMedicines
                ?.map((m) => `${m.name} (${m.dosagePerDay}x/day, ${m.remainingQuantity} left, adherence: ${Math.round(((m.totalQuantity - m.remainingQuantity) / m.totalQuantity) * 100)}%)`)
                .join(", ") || "None";
            patientContext = `
Patient: ${appointmentContext.userData?.name}
Status: ${appointmentContext.patientStatus || "Stable"}
Vitals: BP ${appointmentContext.healthData?.bloodPressure}, HR ${appointmentContext.healthData?.heartRate} BPM, Temp ${appointmentContext.healthData?.temperature}°C
Medications: ${meds}
Appointment: ${appointmentContext.slotDate?.replace(/_/g, "/")} at ${appointmentContext.slotTime}
      `.trim();
        }
        const systemPrompt = `You are an intelligent clinical assistant for doctors at ADJ's CODEs Pharmaceutical, Lagos Nigeria.

You assist doctors — not patients. Your job is to make their work faster and smarter.

${appointmentContext ? `CURRENT PATIENT CONTEXT:\n${patientContext}` : ""}

YOUR CAPABILITIES:
- Draft professional patient alert messages based on vitals or medication data
- Explain drug interactions, contraindications, and side effects
- Suggest clinical notes wording based on vitals entered
- Answer medical reference questions (drug classes, dosing guidelines, conditions)
- Help interpret adherence patterns and suggest follow-up actions
- Summarize patient status in clear clinical language

TONE: Professional, concise, clinically accurate.
Always provide actionable output. If drafting an alert or note, provide the full text ready to copy.
Never refuse a clinically relevant question.`;
        const geminiHistory = (history || []).map((h) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
        }));
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [
                    ...geminiHistory,
                    { role: "user", parts: [{ text: message }] },
                ],
                generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
            }),
        });
        const geminiData = (await geminiRes.json());
        if (!geminiRes.ok)
            return res.status(500).json({ success: false, message: "Gemini error" });
        const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Could not generate response.";
        res.status(200).json({ success: true, reply });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export { chatWithGemini, chatWithGeminiDoctor };
//# sourceMappingURL=chatController.js.map