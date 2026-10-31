import { Controller, Get, Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
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
  ],
  providers: [
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
