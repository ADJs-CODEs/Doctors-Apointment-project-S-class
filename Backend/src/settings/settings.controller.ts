import { Body, Controller, Get, HttpCode, Post, Put, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { UserAuthGuard, UserId } from '../common/auth';
import { MODEL } from '../database/models';
import type { IUser } from '../database/schemas/user.schema';
import { GoogleCalendar } from './google-calendar';
import { CATEGORIES, LOCKED_EMAIL, normalizeSettings, Preferences } from './preferences';

@Controller('api/user')
@UseGuards(UserAuthGuard)
export class SettingsController {
  constructor(
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    private readonly prefs: Preferences,
    private readonly calendar: GoogleCalendar,
  ) {}

  @Get('settings')
  async get(@UserId() userId: string) {
    const user = await this.users.findById(userId).select(['settings', 'googleCalendar']).lean();
    return {
      success: true,
      settings: normalizeSettings(user?.settings),
      categories: CATEGORIES,
      lockedEmail: LOCKED_EMAIL,
      googleCalendar: this.calendar.status(user ?? {}),
    };
  }

  /** Saves the whole settings object (anything missing or invalid falls back to defaults). */
  @Put('settings')
  async save(@UserId() userId: string, @Body('settings') raw: unknown) {
    const settings = normalizeSettings(raw);
    await this.users.updateOne({ _id: userId }, { $set: { settings } });
    this.prefs.forget(userId);
    return { success: true, message: 'Settings saved', settings };
  }

  @Post('integrations/google-calendar/connect')
  @HttpCode(200)
  async connect(@UserId() userId: string, @Body('code') code?: string) {
    const result = await this.calendar.connect(userId, code);
    const sync = await this.calendar.syncUpcoming(userId);
    return { ...result, added: sync.added };
  }

  @Post('integrations/google-calendar/sync')
  @HttpCode(200)
  sync(@UserId() userId: string) {
    return this.calendar.syncUpcoming(userId);
  }

  @Post('integrations/google-calendar/disconnect')
  @HttpCode(200)
  disconnect(@UserId() userId: string) {
    return this.calendar.disconnect(userId);
  }
}
