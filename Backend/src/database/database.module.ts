import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentSchema } from './schemas/appointment.schema';
import { DoctorSchema } from './schemas/doctor.schema';
import {
  ChatMessageSchema,
  ConnectionSchema,
  EmojiPingSchema,
  NotificationSchema,
  PushSubscriptionSchema,
  WishWellSchema,
} from './schemas/social.schemas';
import { UserSchema } from './schemas/user.schema';
import {
  GiftEventSchema,
  PayoutSchema,
  WalletSchema,
  WalletTransactionSchema,
} from './schemas/wallet.schemas';
import { EmailNormalizer } from './email-normalizer';
import { MODEL } from './models';

const models = MongooseModule.forFeature([
  { name: MODEL.doctor, schema: DoctorSchema },
  { name: MODEL.user, schema: UserSchema },
  { name: MODEL.appointment, schema: AppointmentSchema },
  { name: MODEL.connection, schema: ConnectionSchema },
  { name: MODEL.emojiPing, schema: EmojiPingSchema },
  { name: MODEL.notification, schema: NotificationSchema },
  { name: MODEL.wishWell, schema: WishWellSchema },
  { name: MODEL.chatMessage, schema: ChatMessageSchema },
  { name: MODEL.pushSubscription, schema: PushSubscriptionSchema },
  { name: MODEL.wallet, schema: WalletSchema },
  { name: MODEL.walletTransaction, schema: WalletTransactionSchema },
  { name: MODEL.giftEvent, schema: GiftEventSchema },
  { name: MODEL.payout, schema: PayoutSchema },
]);

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is not defined in .env');
        // MONGODB_URI ends at the host; the database name is added here,
        // same as the Express app did.
        return { uri: `${uri}/prescripto` };
      },
    }),
    models,
  ],
  providers: [EmailNormalizer],
  exports: [models],
})
export class DatabaseModule {}
