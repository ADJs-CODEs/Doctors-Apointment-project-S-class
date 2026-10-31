import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IUser } from '../database/schemas/user.schema';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const describeSchedule = (m: { frequencyType?: string; dosagePerDay: number }) =>
  m.frequencyType === 'interval'
    ? `every ${m.dosagePerDay} hours`
    : `${m.dosagePerDay} dose(s)/day`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger('ChatService');

  constructor(
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
  ) {}

  /** Patient-facing assistant, primed with the patient's own appointments, meds and vitals. */
  async patientChat(userId: string, body: { message?: string; history?: ChatTurn[] }) {
    if (!body.message) fail('Message required');

    const [user, appointments] = await Promise.all([
      this.users.findById(userId).select('-password'),
      this.appointments.find({ userId }).sort({ date: -1 }).limit(5),
    ]);

    const upcoming = appointments
      .filter((a) => !a.isCompleted && !a.cancelled)
      .map(
        (a) =>
          `- Doctor: ${a.docData?.name} (${a.docData?.speciality}), Date: ${a.slotDate.replace(/_/g, '/')}, Time: ${a.slotTime}, Paid: ${a.payment ? 'Yes' : 'No'}`,
      )
      .join('\n');

    const activeMeds = appointments
      .filter((a) => a.isCompleted && a.healthData?.prescribedMedicines?.length)
      .flatMap((a) =>
        a.healthData.prescribedMedicines
          .filter((m) => m.remainingQuantity > 0)
          .map((m) => `- ${m.name}: ${describeSchedule(m)}, ${m.remainingQuantity} remaining`),
      )
      .join('\n');

    const latest = appointments.find((a) => a.healthData?.heartRate);
    const vitals = latest
      ? `Heart rate: ${latest.healthData.heartRate} BPM, Blood pressure: ${latest.healthData.bloodPressure}, Temperature: ${latest.healthData.temperature}°C`
      : 'No vitals recorded yet';

    const firstName = user?.name?.split(' ')[0] || 'there';
    const systemPrompt = `You are a knowledgeable and friendly medical assistant for ADJ's CODEs Pharmaceutical, a digital healthcare platform based in Lagos, Nigeria.

You are speaking with ${user?.name || 'a patient'}.

Here is their current medical context:

UPCOMING APPOINTMENTS:
${upcoming || 'No upcoming appointments'}

ACTIVE MEDICATIONS:
${activeMeds || 'No active medications'}

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
Always refer to the patient by their first name: ${firstName}
You are a helpful assistant, not a gatekeeper.`;

    const reply = await this.askGemini('gemini-2.5-flash', systemPrompt, body, {
      temperature: 0.7,
      maxOutputTokens: 512,
    });
    return { success: true, reply: reply ?? 'Sorry, I could not generate a response.' };
  }

  /** Clinical assistant for doctors, optionally primed with one appointment's details. */
  async doctorChat(body: { message?: string; history?: ChatTurn[]; appointmentContext?: any }) {
    if (!body.message) fail('Message required');

    const ctx = body.appointmentContext;
    let patientContext = '';
    if (ctx) {
      const meds =
        ctx.healthData?.prescribedMedicines
          ?.map((m: any) => {
            const adherence = m.totalQuantity
              ? Math.round(((m.totalQuantity - m.remainingQuantity) / m.totalQuantity) * 100)
              : 0;
            return `${m.name} (${describeSchedule(m)}, ${m.remainingQuantity} left, adherence: ${adherence}%)`;
          })
          .join(', ') || 'None';
      patientContext = `CURRENT PATIENT CONTEXT:
Patient: ${ctx.userData?.name}
Status: ${ctx.patientStatus || 'Stable'}
Vitals: BP ${ctx.healthData?.bloodPressure}, HR ${ctx.healthData?.heartRate} BPM, Temp ${ctx.healthData?.temperature}°C
Medications: ${meds}
Appointment: ${ctx.slotDate?.replace(/_/g, '/')} at ${ctx.slotTime}`;
    }

    const systemPrompt = `You are an intelligent clinical assistant for doctors at ADJ's CODEs Pharmaceutical, Lagos Nigeria.

You assist doctors — not patients. Your job is to make their work faster and smarter.

${patientContext}

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

    // was gemini-2.0-flash (an older generation); use the same model as the patient chat
    const reply = await this.askGemini('gemini-2.5-flash', systemPrompt, body, {
      temperature: 0.4,
      maxOutputTokens: 600,
    });
    return { success: true, reply: reply ?? 'Could not generate response.' };
  }

  private async askGemini(
    model: string,
    systemPrompt: string,
    body: { message?: string; history?: ChatTurn[] },
    generationConfig: { temperature: number; maxOutputTokens: number },
  ): Promise<string | undefined> {
    const history = (body.history ?? []).map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    }));

    const res = await fetch(GEMINI_URL(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY ?? '',
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [...history, { role: 'user', parts: [{ text: body.message }] }],
        generationConfig,
      }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) {
      this.logger.error(`Gemini error: ${JSON.stringify(data?.error ?? data)}`);
      fail('Gemini API error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  }
}
