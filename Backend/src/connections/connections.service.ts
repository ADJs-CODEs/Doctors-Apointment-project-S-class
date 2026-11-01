import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IConnection } from '../database/schemas/social.schemas';
import type { IUser } from '../database/schemas/user.schema';
import { EmailNotifications } from '../notifications/email-notifications';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "Watching over": a person (requester) asks to follow a patient's health data;
// the patient accepts or rejects. Accepted watchers get read-only access.
@Injectable()
export class ConnectionsService {
  constructor(
    @InjectModel(MODEL.connection) private readonly connections: Model<IConnection>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly emails: EmailNotifications,
  ) {}

  async request(requesterId: string, patientEmail?: string) {
    if (!patientEmail) fail('Patient email required');

    const patient = await this.users.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(patientEmail.trim())}$`, 'i') },
    });
    if (!patient) fail('No user found with that email', HttpStatus.NOT_FOUND);
    const patientId = patient._id.toString();
    if (patientId === requesterId) fail("You can't connect to yourself");

    const existing = await this.connections.findOne({ requesterId, patientId });
    if (existing?.status === 'pending') fail('Request already sent');
    if (existing?.status === 'accepted') fail('Already connected');
    const resent = existing?.status === 'rejected';
    if (existing && resent) {
      existing.status = 'pending';
      await existing.save();
    } else {
      try {
        await new this.connections({ requesterId, patientId }).save();
      } catch (err: any) {
        if (err.code === 11000) fail('Request already exists');
        throw err;
      }
    }

    const requester = await this.users.findById(requesterId).select('name email');
    if (requester) this.emails.careRequest(patient, requester);
    return { success: true, message: resent ? 'Connection request re-sent' : 'Connection request sent' };
  }

  async respond(userId: string, body: { connectionId?: string; action?: string }) {
    const { connectionId, action } = body;
    if (action !== 'accepted' && action !== 'rejected') fail('Invalid action');

    const connection = await this.connections.findById(connectionId);
    if (!connection) fail('Request not found', HttpStatus.NOT_FOUND);
    if (connection.patientId !== userId) fail('Unauthorized', HttpStatus.FORBIDDEN);

    connection.status = action;
    await connection.save();

    const [requester, patient] = await Promise.all([
      this.users.findById(connection.requesterId).select('email name'),
      this.users.findById(userId).select('email name'),
    ]);
    if (requester && patient) this.emails.careResponse(patient, requester, userId, action === 'accepted');
    return { success: true, message: `Request ${action}` };
  }

  async pendingRequests(userId: string) {
    const pending = await this.connections.find({ patientId: userId, status: 'pending' });
    const requests = await Promise.all(
      pending.map(async (conn) => ({
        ...conn.toObject(),
        requester: await this.users.findById(conn.requesterId).select('name email image'),
      })),
    );
    return { success: true, requests };
  }

  async watchingOver(userId: string) {
    const accepted = await this.connections.find({ requesterId: userId, status: 'accepted' });
    const watching = await Promise.all(
      accepted.map(async (conn) => ({
        ...conn.toObject(),
        patient: await this.users.findById(conn.patientId).select('name email image phone'),
      })),
    );
    return { success: true, watching };
  }

  async watchers(userId: string) {
    const accepted = await this.connections.find({ patientId: userId, status: 'accepted' });
    const watchers = await Promise.all(
      accepted.map(async (conn) => ({
        ...conn.toObject(),
        watcher: await this.users.findById(conn.requesterId).select('name email image'),
      })),
    );
    return { success: true, watchers };
  }

  async remove(userId: string, connectionId?: string) {
    const connection = await this.connections.findById(connectionId);
    if (!connection) fail('Connection not found', HttpStatus.NOT_FOUND);
    // either side can end the connection
    if (connection.patientId !== userId && connection.requesterId !== userId) {
      fail('Unauthorized', HttpStatus.FORBIDDEN);
    }
    await this.connections.findByIdAndDelete(connectionId);

    // tell the other person, unless it was only a pending request
    if (connection.status === 'accepted') {
      const byPatient = connection.patientId === userId;
      const [me, other] = await Promise.all([
        this.users.findById(userId).select('name email'),
        this.users.findById(byPatient ? connection.requesterId : connection.patientId).select('name email'),
      ]);
      if (me && other) this.emails.careRemoved(other, me, byPatient ? 'patient' : 'watcher');
    }
    return { success: true, message: 'Connection removed' };
  }

  async patientData(watcherId: string, patientId: string) {
    const connection = await this.connections.findOne({
      requesterId: watcherId,
      patientId,
      status: 'accepted',
    });
    if (!connection) fail('No active connection with this patient', HttpStatus.FORBIDDEN);

    const [patient, appointments] = await Promise.all([
      this.users.findById(patientId).select('-password -resetToken -resetTokenExpire -settings -googleCalendar'),
      this.appointments.find({ userId: patientId }).sort({ date: -1 }),
    ]);
    return { success: true, patient, appointments };
  }
}
