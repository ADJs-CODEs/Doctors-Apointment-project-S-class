import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { UserAuthGuard, UserId } from '../common/auth';
import { AppNotifier } from './app-notifier';

// Device (Web Push) notifications: the browser asks for the public key, subscribes,
// and hands the subscription to us; logging out or turning it off removes it.
@Controller('api/user/push')
@UseGuards(UserAuthGuard)
export class PushController {
  constructor(private readonly notifier: AppNotifier) {}

  @Get('key')
  key() {
    const publicKey = this.notifier.publicKey();
    return { success: !!publicKey, publicKey };
  }

  @Post('subscribe')
  @HttpCode(200)
  subscribe(@UserId() userId: string, @Body('subscription') subscription: any, @Headers('user-agent') ua?: string) {
    return this.notifier.subscribe(userId, subscription, ua);
  }

  @Post('unsubscribe')
  @HttpCode(200)
  unsubscribe(@UserId() userId: string, @Body('endpoint') endpoint?: string) {
    return this.notifier.unsubscribe(userId, endpoint);
  }
}
