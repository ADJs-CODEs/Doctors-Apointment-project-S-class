import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import * as crypto from 'crypto';
import { isValidObjectId, type Model, type Types } from 'mongoose';
import { NOT_A_HOLD } from '../appointments/booking.service';
import { JOIN_EARLY, JOIN_LATE } from '../appointments/video.service';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { CallKind, CallStatus, ICall } from '../database/schemas/call.schema';
import type { IDoctor } from '../database/schemas/doctor.schema';
import type { IUser } from '../database/schemas/user.schema';
import { RealtimeGateway } from '../integrations/realtime.gateway';
import { AppNotifier } from '../notifications/app-notifier';
import { slotInstant } from '../notifications/clinic-time';

/** how long the other side's phone rings before it counts as missed */
export const RING_MS = 40_000;
/** a call nobody hung up on is closed after this */
const MAX_CALL_MS = 3 * 60 * 60_000;
const DAILY_API = 'https://api.daily.co/v1';

type Side = 'doctor' | 'patient';
type Me = { side: Side; id: string };

const otherSide = (s: Side): Side => (s === 'doctor' ? 'patient' : 'doctor');
const myId = (c: ICall, side: Side) => (side === 'doctor' ? c.doctorId : c.patientId);

/** What both apps get about a call (never the room link: that comes with a personal token on join). */
export const callView = (c: ICall) => ({
  _id: String(c._id),
  kind: c.kind,
  status: c.status,
  startedBy: c.startedBy,
  appointmentId: c.appointmentId,
  doctor: { _id: c.doctorId, name: c.doctorName, image: c.doctorImage },
  patient: { _id: c.patientId, name: c.patientName, image: c.patientImage },
  ringUntil: c.ringUntil,
  answeredAt: c.answeredAt,
  endedAt: c.endedAt,
  endedBy: c.endedBy,
  createdAt: c.createdAt,
});

/**
 * In-app voice and video calls. Ringing goes over the socket (both apps already sit in their
 * private room) plus a device push to the patient; the call itself is a private Daily room,
 * or a Jitsi room in a new tab when DAILY_API_KEY isn't set.
 *  - Doctors may call any of their own patients at any time (no booking, no payment).
 *  - Patients may call their doctor only during a paid video visit (10 min before to an hour after).
 */
@Injectable()
export class CallsService {
  private readonly logger = new Logger('Calls');
  private readonly ringTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    @InjectModel(MODEL.call) private readonly calls: Model<ICall>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    private readonly realtime: RealtimeGateway,
    private readonly notifier: AppNotifier,
  ) {}

  private get dailyKey() {
    return process.env.DAILY_API_KEY;
  }

  // --- starting a call ---

  async start(me: Me, body: { to?: string; kind?: string; appointmentId?: string }) {
    await this.sweep();
    const kind: CallKind = body.kind === 'video' ? 'video' : 'voice';
    const to = typeof body.to === 'string' ? body.to : '';
    if (!isValidObjectId(to)) fail(me.side === 'doctor' ? 'Patient not found' : 'Doctor not found', HttpStatus.NOT_FOUND);
    const doctorId = me.side === 'doctor' ? me.id : to;
    const patientId = me.side === 'doctor' ? to : me.id;

    const [doctor, patient] = await Promise.all([
      this.doctors.findById(doctorId).select(['name', 'image']).lean(),
      this.users.findById(patientId).select(['name', 'image']).lean(),
    ]);
    if (!doctor || !patient) fail(me.side === 'doctor' ? 'Patient not found' : 'Doctor not found', HttpStatus.NOT_FOUND);

    const appointmentId = me.side === 'doctor' ? await this.doctorMayCall(doctorId, patientId) : await this.patientMayCall(doctorId, patientId);

    const callId = crypto.randomBytes(12).toString('hex');
    const room = await this.makeRoom(callId, kind);
    let call: ICall;
    try {
      call = await this.calls.create({
        doctorId,
        patientId,
        doctorName: doctor.name,
        patientName: patient.name,
        doctorImage: doctor.image,
        patientImage: patient.image,
        kind,
        startedBy: me.side,
        appointmentId: appointmentId ?? (typeof body.appointmentId === 'string' ? body.appointmentId : undefined),
        status: 'ringing',
        open: true,
        ...room,
        ringUntil: new Date(Date.now() + RING_MS),
      });
    } catch (err: any) {
      if (err?.code !== 11000) throw err;
      // one of the unique "open call" indexes: say who is busy
      const meBusy = await this.calls.exists({ [me.side === 'doctor' ? 'doctorId' : 'patientId']: me.id, open: true });
      fail(meBusy ? 'You are already in a call' : `${me.side === 'doctor' ? patient.name : doctor.name} is on another call. Try again shortly.`);
    }

    const view = callView(call);
    this.realtime.emitTo(otherSide(me.side), to, 'call_incoming', view);
    if (me.side === 'doctor') {
      // wakes the patient's phone even with the site closed
      this.notifier.pushOnly(patientId, {
        title: `${doctor.name} is calling`,
        message: kind === 'video' ? 'Incoming video call. Tap to answer.' : 'Incoming voice call. Tap to answer.',
        type: 'appointment',
        link: `/call-incoming/${call._id}`,
        urgent: true,
        tag: `call-${call._id}`,
      });
    }
    this.ringTimers.set(
      String(call._id),
      setTimeout(() => this.timeout(String(call._id)).catch((e) => this.logger.warn(`ring timeout: ${e.message}`)), RING_MS + 1000),
    );
    return { success: true, call: view, join: await this.joinFor(call, me.side) };
  }

  /** A doctor can call anyone who's had a (real, not cancelled) booking with them. */
  private async doctorMayCall(doctorId: string, patientId: string) {
    const a = await this.appointments
      .findOne({ docId: doctorId, userId: patientId, cancelled: { $ne: true }, ...NOT_A_HOLD })
      .sort({ date: -1 })
      .select('_id');
    if (!a) fail('You can only call your own patients', HttpStatus.FORBIDDEN);
    return undefined; // not tied to a visit
  }

  /** A patient can only ring their doctor inside a paid video visit's window. */
  private async patientMayCall(doctorId: string, patientId: string) {
    const visits = await this.appointments
      .find({ docId: doctorId, userId: patientId, kind: 'video', payment: true, cancelled: { $ne: true }, missed: { $exists: false }, isCompleted: { $ne: true } })
      .select(['slotDate', 'slotTime'])
      .lean();
    const now = Date.now();
    const current = visits.find((v) => {
      const start = slotInstant(v.slotDate, v.slotTime)?.getTime();
      return start !== undefined && now >= start - JOIN_EARLY && now <= start + JOIN_LATE;
    });
    if (!current) fail('You can call your doctor during a booked video visit. Book one, or wait for your doctor to call you.', HttpStatus.FORBIDDEN);
    return String(current._id);
  }

  // --- answering and ending ---

  async accept(me: Me, callId: string) {
    const call = await this.mine(me, callId);
    if (call.startedBy === me.side) fail("You can't answer your own call");
    const accepted = await this.calls.findOneAndUpdate(
      { _id: call._id, status: 'ringing', ringUntil: { $gte: new Date() } },
      { $set: { status: 'active', answeredAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!accepted) fail(call.status === 'active' ? 'This call was already answered' : 'This call has ended');
    this.clearTimer(callId);
    this.broadcast(accepted);
    return { success: true, call: callView(accepted), join: await this.joinFor(accepted, me.side) };
  }

  /** Decline (callee), cancel (caller, still ringing) or hang up (either, once answered). */
  async hangUp(me: Me, callId: string) {
    const call = await this.mine(me, callId);
    const next: CallStatus = call.status === 'active' ? 'ended' : call.startedBy === me.side ? 'cancelled' : 'declined';
    const done = await this.close(call._id, ['ringing', 'active'], next, me.side);
    if (!done) return { success: true, message: 'This call has already ended' };
    return { success: true, call: callView(done) };
  }

  /** A ringing or live call I'm in (after a refresh, the app picks it back up). */
  async current(me: Me) {
    await this.sweep();
    const call = await this.calls.findOne({ [me.side === 'doctor' ? 'doctorId' : 'patientId']: me.id, open: true });
    if (!call) return { success: true, call: null };
    // the room link only for a call that's live, or one I'm the caller of
    const join = call.status === 'active' || call.startedBy === me.side ? await this.joinFor(call, me.side) : null;
    return { success: true, call: callView(call), join };
  }

  async history(me: Me) {
    const calls = await this.calls
      .find({ [me.side === 'doctor' ? 'doctorId' : 'patientId']: me.id })
      .sort({ createdAt: -1 })
      .limit(30);
    return { success: true, calls: calls.map(callView) };
  }

  // --- internals ---

  private async mine(me: Me, callId: string) {
    if (!/^[a-f0-9]{24}$/.test(callId)) fail('Call not found', HttpStatus.NOT_FOUND);
    const call = await this.calls.findById(callId);
    if (!call || myId(call, me.side) !== me.id) fail('Call not found', HttpStatus.NOT_FOUND);
    return call;
  }

  /** Closes it once (whoever gets there first), tells both sides, and records a missed call. */
  private async close(id: Types.ObjectId | string, from: CallStatus[], to: CallStatus, by: Side | 'system'): Promise<ICall | null> {
    const done = await this.calls.findOneAndUpdate(
      { _id: id, status: { $in: from } },
      { $set: { status: to, endedAt: new Date(), endedBy: by }, $unset: { open: 1 } },
      { returnDocument: 'after' },
    );
    if (!done) return null;
    this.clearTimer(String(done._id));
    this.broadcast(done);
    if (to === 'missed') this.missedCall(done);
    if (done.provider === 'daily' && this.dailyKey) {
      // the room is single-use; delete it so its link stops working
      axios.delete(`${DAILY_API}/rooms/${done.room}`, { headers: { Authorization: `Bearer ${this.dailyKey}` }, timeout: 10_000 }).catch(() => undefined);
    }
    return done;
  }

  private async timeout(callId: string) {
    this.ringTimers.delete(callId);
    await this.close(callId, ['ringing'], 'missed', 'system');
  }

  /** Server restarts lose timers: close anything that should already be over. */
  private async sweep() {
    const now = Date.now();
    const stale = await this.calls
      .find({ open: true, $or: [{ status: 'ringing', ringUntil: { $lt: new Date(now) } }, { status: 'active', answeredAt: { $lt: new Date(now - MAX_CALL_MS) } }] })
      .select(['status'])
      .lean();
    for (const c of stale) await this.close(c._id, [c.status], c.status === 'ringing' ? 'missed' : 'ended', 'system');
  }

  private clearTimer(callId: string) {
    const t = this.ringTimers.get(callId);
    if (t) clearTimeout(t);
    this.ringTimers.delete(callId);
  }

  private broadcast(c: ICall) {
    const view = callView(c);
    this.realtime.emitTo('doctor', c.doctorId, 'call_update', view);
    this.realtime.emitTo('patient', c.patientId, 'call_update', view);
  }

  private missedCall(c: ICall) {
    const what = c.kind === 'video' ? 'video call' : 'call';
    if (c.startedBy === 'doctor') {
      this.notifier.send(c.patientId, {
        title: `Missed ${what} from ${c.doctorName}`,
        message: 'Open your messages to reply.',
        type: 'message',
        link: `/messages?doctor=${c.doctorId}`,
        tag: `call-${c._id}`,
        category: 'messages',
      });
    } else {
      this.notifier.toDoctor(c.doctorId, {
        title: `Missed ${what} from ${c.patientName}`,
        message: 'They called during their video visit. Call them back from Messages.',
        type: 'message',
        link: `/doctor-messages?patient=${c.patientId}`,
      });
    }
  }

  /** A private room that lives a few hours. Voice calls start with cameras off. */
  private async makeRoom(callId: string, kind: CallKind): Promise<Pick<ICall, 'provider' | 'room' | 'url'>> {
    if (this.dailyKey) {
      try {
        const { data } = await axios.post(
          `${DAILY_API}/rooms`,
          {
            name: `call-${callId}`,
            privacy: 'private',
            properties: {
              exp: Math.floor((Date.now() + MAX_CALL_MS) / 1000),
              eject_at_room_exp: true,
              enable_prejoin_ui: false,
              enable_chat: false,
              enable_screenshare: kind === 'video',
              start_video_off: kind === 'voice',
              max_participants: 2,
            },
          },
          { headers: { Authorization: `Bearer ${this.dailyKey}` }, timeout: 10_000 },
        );
        return { provider: 'daily', room: data.name, url: data.url };
      } catch (err: any) {
        this.logger.error(`Daily room failed: ${err.response?.data?.info ?? err.message}`);
        // fall back to Jitsi so the call can still happen
      }
    }
    const tag = crypto.createHmac('sha256', process.env.JWT_SECRET ?? 'calls').update(`call:${callId}`).digest('hex').slice(0, 20);
    const room = `ADJsCODEs-call-${tag}`;
    return { provider: 'jitsi', room, url: `https://meet.jit.si/${room}` };
  }

  /** The link for one side: a personal Daily token (the doctor owns the room), or the Jitsi link. */
  private async joinFor(c: ICall, side: Side) {
    const name = side === 'doctor' ? c.doctorName : c.patientName;
    if (c.provider === 'daily' && this.dailyKey) {
      try {
        const { data } = await axios.post(
          `${DAILY_API}/meeting-tokens`,
          {
            properties: {
              room_name: c.room,
              user_name: name,
              is_owner: side === 'doctor',
              start_video_off: c.kind === 'voice',
              exp: Math.floor((Date.now() + MAX_CALL_MS) / 1000),
            },
          },
          { headers: { Authorization: `Bearer ${this.dailyKey}` }, timeout: 10_000 },
        );
        return { provider: 'daily' as const, url: `${c.url}?t=${data.token}`, embed: true };
      } catch (err: any) {
        this.logger.error(`Daily token failed: ${err.response?.data?.info ?? err.message}`);
        fail("Couldn't connect the call. Try again.");
      }
    }
    const voice = c.kind === 'voice' ? '#config.startWithVideoMuted=true' : '';
    return { provider: 'jitsi' as const, url: `${c.url}${voice}`, embed: false };
  }
}
