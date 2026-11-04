import { Controller, Get, Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { FinanceService } from './admin/finance.service';
import { AvailabilityController, DoctorScheduleController } from './appointments/availability.controller';
import { BookingService } from './appointments/booking.service';
import { MissedAppointments } from './appointments/missed-appointments';
import { DoctorVideoController, PatientVideoController } from './appointments/video.controller';
import { VideoService } from './appointments/video.service';
import { DoctorCallsController, PatientCallsController } from './calls/calls.controller';
import { CallsService } from './calls/calls.service';
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import {
  AdminWishWellController,
  DoctorNotificationsController,
  EmojiController,
  NotificationsController,
  WishWellController,
} from './community/community.controllers';
import { EmojiService, NotificationsService, WishWellService } from './community/community.service';
import { ConnectionsController } from './connections/connections.controller';
import { ConnectionsService } from './connections/connections.service';
import { DatabaseModule } from './database/database.module';
import { DoctorController } from './doctor/doctor.controller';
import { DoctorEarningsService } from './doctor/doctor-earnings.service';
import { DoctorSettingsController } from './doctor/doctor-settings.controller';
import { AdminDoctorPayoutsController, DoctorWalletController } from './doctor/doctor-wallet.controller';
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
import { PaystackWebhookController } from './payments/paystack-webhook.controller';
import { AdminPharmaciesController, AdminShopController, PharmacyController, ShopController } from './pharmacy/pharmacy.controller';
import { PharmacyEarningsService } from './pharmacy/earnings.service';
import { OrderService } from './pharmacy/order.service';
import { ProductService } from './pharmacy/product.service';
import { ShopService } from './pharmacy/shop.service';
import { PharmacyService } from './pharmacy/pharmacy.service';
import { PaystackService } from './payments/paystack.service';
import { StripeWebhookController } from './payments/stripe-webhook.controller';
import { MapsService } from './maps/maps.service';
import { GoogleCalendar } from './settings/google-calendar';
import { DoctorPreferences } from './settings/doctor-preferences';
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
    AdminWishWellController,
    NotificationsController,
    DoctorNotificationsController,
    EmojiController,
    PatientMessagesController,
    DoctorMessagesController,
    PushController,
    WalletController,
    AdminPayoutsController,
    SettingsController,
    DoctorSettingsController,
    DoctorWalletController,
    AdminDoctorPayoutsController,
    MapsController,
    PatientVideoController,
    DoctorVideoController,
    PatientCallsController,
    DoctorCallsController,
    AvailabilityController,
    DoctorScheduleController,
    StripeWebhookController,
    PaystackWebhookController,
    PharmacyController,
    AdminPharmaciesController,
    ShopController,
    AdminShopController,
  ],
  providers: [
    PaystackService,
    PharmacyService,
    ProductService,
    ShopService,
    OrderService,
    PharmacyEarningsService,
    DoctorEarningsService,
    BookingService,
    VideoService,
    CallsService,
    MapsService,
    Preferences,
    DoctorPreferences,
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
    FinanceService,
    ChatService,
    ConnectionsService,
    WishWellService,
    NotificationsService,
    EmojiService,
  ],
})
export class AppModule {}
