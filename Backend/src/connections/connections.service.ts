import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IConnection } from '../database/schemas/social.schemas';
import type { IUser } from '../database/schemas/user.schema';
import { MailService } from '../integrations/integrations';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const emailShell = (body: string) => `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#0f172a;padding:20px;border-radius:16px;text-align:center;margin-bottom:24px">
      <span style="color:#2dd4bf;font-size:28px;font-weight:900">+</span>
      <span style="color:white;font-weight:900;font-size:16px;margin-left:8px;text-transform:uppercase;letter-spacing:2px">ADJ's CODEs</span>
    </div>
    ${body}
  </div>`;

const button = (href: string, label: string, color = '#0f172a') =>
  `<a href="${href}" style="display:inline-block;background:${color};color:white;padding:14px 28px;border-radius:12px;font-weight:900;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-top:8px">${label}</a>`;

// "Watching over": a person (requester) asks to follow a patient's health data;
// the patient accepts or rejects. Accepted watchers get read-only access.
@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger('ConnectionsService');

  constructor(
    @InjectModel(MODEL.connection) private readonly connections: Model<IConnection>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly mail: MailService,
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
    if (existing?.status === 'rejected') {
      existing.status = 'pending';
      await existing.save();
      return { success: true, message: 'Connection request re-sent' };
    }

    try {
      await new this.connections({ requesterId, patientId }).save();
    } catch (err: any) {
      if (err.code === 11000) fail('Request already exists');
      throw err;
    }

    const requester = await this.users.findById(requesterId).select('name email');
    await this.notify(
      patient.email,
      `${requester?.name} wants to watch over you on ADJ's CODEs`,
      emailShell(`
        <h2 style="color:#0f172a;font-size:22px;font-weight:900">Care Connection Request</h2>
        <p style="color:#64748b"><strong>${requester?.name}</strong> (${requester?.email}) has sent you a request to monitor your health activity on ADJ's CODEs.</p>
        <p style="color:#64748b">Log in to your account to accept or reject this request.</p>
        ${button(`${process.env.CLIENT_URL}/my-profile`, 'Review Request')}`),
    );
    return { success: true, message: 'Connection request sent' };
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
      this.users.findById(userId).select('name'),
    ]);
    if (requester?.email) {
      await this.notify(
        requester.email,
        `${patient?.name} ${action} your care connection request`,
        emailShell(`
          <h2 style="color:#0f172a;font-size:22px;font-weight:900">Connection ${action === 'accepted' ? 'Accepted ✓' : 'Declined'}</h2>
          <p style="color:#64748b"><strong>${patient?.name}</strong> has ${action} your care connection request.</p>
          ${action === 'accepted' ? button(`${process.env.CLIENT_URL}/watching-over`, 'View Their Dashboard', '#0d9488') : ''}`),
      );
    }
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
      this.users.findById(patientId).select('-password -resetToken -resetTokenExpire'),
      this.appointments.find({ userId: patientId }).sort({ date: -1 }),
    ]);
    return { success: true, patient, appointments };
  }

  // The connection change is already saved; a failed email shouldn't undo it.
  private async notify(to: string, subject: string, html: string) {
    try {
      await this.mail.send({ to, subject, html });
    } catch (err: any) {
      this.logger.warn(`connection email to ${to} failed: ${err.message}`);
    }
  }
}
