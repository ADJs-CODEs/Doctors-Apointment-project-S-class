import { Controller, Get, Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AvailabilityController, DoctorScheduleController } from './appointments/availability.controller';
import { BookingService } from './appointments/booking.service';
import { MissedAppointments } from './appointments/missed-appointments';
import { DoctorVideoController, PatientVideoController } from './appointments/video.controller';
import { VideoService } from './appointments/video.service';
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import {
  EmojiController,
  NotificationsController,
  WishWellController,
} from './community/community.controllers';
import { EmojiService, NotificationsService, WishWellService } from './community/community.service';
import { ConnectionsController } from './connections/connections.controller';
import { ConnectionsService } from './connections/connections.service';
import { DatabaseModule } from './database/database.module';
import { DoctorController } from './doctor/doctor.controller';
import { DoctorService } from './doctor/doctor.service';
import { IntegrationsModule } from './integrations/integrations';
import { LegacyMessageCopier } from './messages/legacy-message-copier';
import { DoctorMessagesController, PatientMessagesController } from './messages/messages.controller';
import { MessagesService } from './messages/messages.service';
import { AppNotifier } from './notifications/app-notifier';
import { DoseReminders } from './notifications/dose-reminders';
import { EmailNotifications } from './notifications/email-notifications';
import { PushController } from './notifications/push.controller';
import { MapsController } from './maps/maps.controller';
import { MapsService } from './maps/maps.service';
import { GoogleCalendar } from './settings/google-calendar';
import { Preferences } from './settings/preferences';
import { SettingsController } from './settings/settings.controller';
import { AdminPayoutsController, WalletController } from './wallet/wallet.controller';
import { WalletService } from './wallet/wallet.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';

@Controller()
class HealthController {
  // Render and uptime checks hit this
  @Get()
  root() {
    return 'API is fully WORKING';
  }
}

@Module({
  imports: [DatabaseModule, IntegrationsModule],
  controllers: [
    HealthController,
    UserController,
    DoctorController,
    AdminController,
    ChatController,
    ConnectionsController,
    WishWellController,
    NotificationsController,
    EmojiController,
    PatientMessagesController,
    DoctorMessagesController,
    PushController,
    WalletController,
    AdminPayoutsController,
    SettingsController,
    MapsController,
    PatientVideoController,
    DoctorVideoController,
    AvailabilityController,
    DoctorScheduleController,
  ],
  providers: [
    BookingService,
    VideoService,
    MapsService,
    Preferences,
    GoogleCalendar,
    WalletService,
    MissedAppointments,
    AppNotifier,
    EmailNotifications,
    DoseReminders,
    MessagesService,
    LegacyMessageCopier,
    UserService,
    DoctorService,
    AdminService,
    ChatService,
    ConnectionsService,
    WishWellService,
    NotificationsService,
    EmojiService,
  ],
})
export class AppModule {}
