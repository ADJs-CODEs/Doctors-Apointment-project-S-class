import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { AnyBulkWriteOperation, Model } from 'mongoose';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IChatMessage } from '../database/schemas/social.schemas';

// Doctor alerts used to live only on the appointment (appointment.messages). On startup,
// copy any that aren't in the chat yet, so they show up in the conversation. legacyKey
// makes this safe to run every time: a message is only ever copied once. The originals
// stay where they are, because the mobile app still reads them there.
@Injectable()
export class LegacyMessageCopier implements OnApplicationBootstrap {
  private readonly logger = new Logger('LegacyMessageCopier');

  constructor(
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    @InjectModel(MODEL.chatMessage) private readonly messages: Model<IChatMessage>,
  ) {}

  async onApplicationBootstrap() {
    try {
      const withMessages = await this.appointments
        .find({ 'messages.0': { $exists: true } })
        .select(['docId', 'userId', 'messages', 'patientStatus'])
        .lean();

      const ops: AnyBulkWriteOperation<IChatMessage>[] = withMessages.flatMap((a) =>
        a.messages
          .filter((m) => m.content && m.sentAt)
          .map((m) => {
            const sentAt = new Date(m.sentAt);
            return {
              updateOne: {
                filter: { legacyKey: `${a._id}:${sentAt.getTime()}` },
                update: {
                  $setOnInsert: {
                    doctorId: a.docId,
                    userId: a.userId,
                    sender: 'doctor' as const,
                    text: m.content,
                    // the old alerts only recorded criticality on the appointment
                    urgent: a.patientStatus === 'Critical',
                    appointmentId: String(a._id),
                    readAt: m.isRead ? sentAt : null,
                    createdAt: sentAt,
                    updatedAt: sentAt,
                  },
                },
                upsert: true,
              },
            };
          }),
      );
      if (!ops.length) return;

      const result = await this.messages.bulkWrite(ops, { ordered: false, timestamps: false });
      if (result.upsertedCount) this.logger.log(`copied ${result.upsertedCount} old doctor alerts into chat`);
    } catch (err: any) {
      this.logger.error(`copying old alerts failed: ${err.message}`);
    }
  }
}
