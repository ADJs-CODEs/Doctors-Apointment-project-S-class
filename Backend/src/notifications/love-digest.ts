import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MODEL } from '../database/models';
import type { IEmojiPing } from '../database/schemas/social.schemas';
import { AppNotifier } from './app-notifier';

// at most one device notification update per person this often, however fast love arrives
const EVERY_MS = 60_000;

/**
 * Love (Wish Well wishes, care-circle emoji) that arrives while the patient's app isn't open is kept
 * as undelivered pings; they replay on screen the next time the app opens (/api/emoji/undelivered).
 * Meanwhile one device notification says how much is waiting. It has a fixed tag, so each update
 * replaces the last instead of stacking up 40 buzzes. Follows their settings and quiet hours.
 */
@Injectable()
export class LoveDigest {
  private lastPush = new Map<string, number>();

  constructor(
    @InjectModel(MODEL.emojiPing) private readonly pings: Model<IEmojiPing>,
    private readonly notifier: AppNotifier,
  ) {}

  /** Keep this for the replay (Wish Well love isn't saved anywhere else). */
  async keep(toUserId: string, emoji: string, fromName: string, fromUserId = 'community') {
    await this.pings.create({ fromUserId, toUserId, emoji, fromName, delivered: false });
  }

  /** Update the one "love is waiting" notification on their devices. Never throws. */
  async notify(toUserId: string, category: 'gifts' | 'careCircle', fromName?: string) {
    const now = Date.now();
    if (now - (this.lastPush.get(toUserId) ?? 0) < EVERY_MS) return;
    this.lastPush.set(toUserId, now);
    try {
      const waiting = await this.pings.countDocuments({ toUserId, delivered: false });
      if (!waiting) return;
      this.notifier.pushIfAllowed(toUserId, {
        title: 'Love is waiting for you',
        message:
          waiting === 1
            ? `${fromName && fromName !== 'The Community' ? fromName : 'Someone'} sent you love. Open the app to see it.`
            : `${waiting} wishes of love arrived while you were away. Open the app to see them.`,
        type: 'care',
        link: '/dashboard',
        tag: 'love-waiting',
        category,
      });
    } catch {
      // a notification must never fail the wish itself
    }
  }
}
