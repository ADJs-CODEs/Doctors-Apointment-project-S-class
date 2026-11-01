import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { DocId, DoctorAuthGuard, UserAuthGuard, UserId } from '../common/auth';
import { EmojiService, NotificationsService, WishWellService } from './community.service';

@Controller('api/wish-well')
export class WishWellController {
  constructor(private readonly wishWell: WishWellService) {}

  @Get('all')
  all() {
    return this.wishWell.publicEntries();
  }

  @Post('consent')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  consent(@UserId() userId: string, @Body() body: any) {
    return this.wishWell.giveConsent(userId, body);
  }

  @Post('opt-out')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  optOut(@UserId() userId: string) {
    return this.wishWell.optOut(userId);
  }

  @Get('pending-consent')
  @UseGuards(UserAuthGuard)
  pendingConsent(@UserId() userId: string) {
    return this.wishWell.pendingConsent(userId);
  }

  @Post('send-emoji')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  sendEmoji(@Body() body: any) {
    return this.wishWell.sendEmoji(body);
  }

  @Post('nominate')
  @UseGuards(DoctorAuthGuard)
  nominate(@DocId() docId: string, @Body() body: any) {
    return this.wishWell.nominate(docId, body);
  }

  @Post('update-status')
  @HttpCode(200)
  @UseGuards(DoctorAuthGuard)
  updateStatus(@DocId() docId: string, @Body() body: any) {
    return this.wishWell.updateStatus(docId, body);
  }

  @Post('remove')
  @HttpCode(200)
  @UseGuards(DoctorAuthGuard)
  remove(@DocId() docId: string, @Body('entryId') entryId?: string) {
    return this.wishWell.remove(docId, entryId);
  }
}

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('create')
  create(@Body() body: any) {
    return this.notifications.create(body);
  }

  @Get('get')
  @UseGuards(UserAuthGuard)
  list(@UserId() userId: string) {
    return this.notifications.list(userId);
  }

  @Post('mark-all-read')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  markAllRead(@UserId() userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Post('mark-one-read')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  markOneRead(@UserId() userId: string, @Body('notificationId') notificationId?: string) {
    return this.notifications.markOneRead(userId, notificationId);
  }

  @Post('clear')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  clear(@UserId() userId: string) {
    return this.notifications.clear(userId);
  }
}

/** The doctor panel's bell: same notifications, only the logged-in doctor's. */
@Controller('api/doctor/notifications')
@UseGuards(DoctorAuthGuard)
export class DoctorNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@DocId() docId: string) {
    return this.notifications.list(docId, 'doctor');
  }

  @Post('mark-all-read')
  @HttpCode(200)
  markAllRead(@DocId() docId: string) {
    return this.notifications.markAllRead(docId, 'doctor');
  }

  @Post('mark-one-read')
  @HttpCode(200)
  markOneRead(@DocId() docId: string, @Body('notificationId') notificationId?: string) {
    return this.notifications.markOneRead(docId, notificationId, 'doctor');
  }

  @Post('clear')
  @HttpCode(200)
  clear(@DocId() docId: string) {
    return this.notifications.clear(docId, 'doctor');
  }
}

@Controller('api/emoji')
@UseGuards(UserAuthGuard)
export class EmojiController {
  constructor(private readonly emoji: EmojiService) {}

  @Post('send')
  send(@UserId() userId: string, @Body() body: any) {
    return this.emoji.send(userId, body);
  }

  @Get('undelivered')
  undelivered(@UserId() userId: string) {
    return this.emoji.undelivered(userId);
  }
}
