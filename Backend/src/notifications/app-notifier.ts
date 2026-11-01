import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import * as webpush from 'web-push';
import { MODEL } from '../database/models';
import type { INotification, IPushSubscription, NotificationType } from '../database/schemas/social.schemas';
import { RealtimeGateway } from '../integrations/realtime.gateway';
import { type Category, Preferences } from '../settings/preferences';

export type AppNotification = {
  title: string;
  message: string;
  type: NotificationType;
  /** path in the patient app to open when it's tapped */
  link?: string;
  /** device notification stays on screen until dismissed */
  urgent?: boolean;
  /** same tag replaces the previous device notification instead of stacking (e.g. one chat) */
  tag?: string;
  /** save to the bell + live update, but don't buzz the device */
  inAppOnly?: boolean;
  /** which notification setting governs the device push; none = always (e.g. urgent) */
  category?: Category;
};

/**
 * Notifications inside the product, for patients (and care-circle watchers, who are
 * patients too). One call does three things:
 *  1. saves it to the bell (notifications collection)
 *  2. pushes it live to any open tab over the socket ("notification" event)
 *  3. sends a device notification (Web Push) to every browser/phone the user turned
 *     them on for. Skipped when VAPID keys aren't configured.
 * Never throws: a failed notification must not fail the user's request.
 */
@Injectable()
export class AppNotifier {
  private readonly logger = new Logger('AppNotifier');
  private pushReady: boolean | undefined;

  constructor(
    @InjectModel(MODEL.notification) private readonly notifications: Model<INotification>,
    @InjectModel(MODEL.pushSubscription) private readonly subscriptions: Model<IPushSubscription>,
    private readonly realtime: RealtimeGateway,
    private readonly prefs: Preferences,
  ) {}

  /** The public key browsers need to subscribe, or null when push isn't set up. */
  publicKey(): string | null {
    return this.setupPush() ? (process.env.VAPID_PUBLIC_KEY as string) : null;
  }

  send(userId: string, n: AppNotification) {
    this.deliver(userId, n).catch((err) => this.logger.warn(`notification for ${userId} failed: ${err.message}`));
  }

  private async deliver(userId: string, n: AppNotification) {
    if (!userId) return;
    const saved = await this.notifications.create({
      userId,
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link,
    });
    this.realtime.emitTo('patient', userId, 'notification', saved.toObject());
    // the bell always keeps it; the device only buzzes if their settings allow it now
    if (!n.inAppOnly && (await this.prefs.allows(userId, n.category, 'push', n.urgent))) {
      await this.push(userId, n, String(saved._id));
    }
  }

  /**
   * A doctor's bell (doctor panel): saved and pushed live to their open tabs. No device
   * push yet: the doctor panel has no service worker, and they also get an email.
   */
  toDoctor(docId: string, n: Pick<AppNotification, 'title' | 'message' | 'type' | 'link'>) {
    if (!docId) return;
    this.notifications
      .create({ userId: docId, audience: 'doctor', title: n.title, message: n.message, type: n.type, link: n.link })
      .then((saved) => this.realtime.emitTo('doctor', docId, 'notification', saved.toObject()))
      .catch((err) => this.logger.warn(`doctor notification for ${docId} failed: ${err.message}`));
  }

  private setupPush() {
    if (this.pushReady !== undefined) return this.pushReady;
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    this.pushReady = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
    if (this.pushReady) {
      webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
    } else {
      this.logger.warn('VAPID keys not set: device notifications are off');
    }
    return this.pushReady;
  }

  private async push(userId: string, n: AppNotification, id: string) {
    if (!this.setupPush()) return;
    const devices = await this.subscriptions.find({ userId }).lean();
    if (!devices.length) return;

    const payload = JSON.stringify({
      id,
      title: n.title,
      body: n.message,
      url: n.link || '/dashboard',
      tag: n.tag || id,
      urgent: !!n.urgent,
      type: n.type,
    });
    await Promise.all(
      devices.map(async (d) => {
        try {
          await webpush.sendNotification({ endpoint: d.endpoint, keys: d.keys }, payload, {
            TTL: n.urgent ? 24 * 60 * 60 : 6 * 60 * 60,
            urgency: n.urgent ? 'high' : 'normal',
          });
        } catch (err: any) {
          // 404/410: the browser dropped this subscription (uninstalled, permission revoked)
          if (err.statusCode === 404 || err.statusCode === 410) {
            await this.subscriptions.deleteOne({ _id: d._id });
          } else {
            this.logger.warn(`push to ${userId} failed: ${err.statusCode ?? ''} ${err.message}`);
          }
        }
      }),
    );
  }

  // --- device subscriptions ---

  async subscribe(userId: string, sub: any, userAgent?: string) {
    const endpoint = sub?.endpoint;
    const keys = sub?.keys;
    if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || !keys?.p256dh || !keys?.auth) {
      return { success: false, message: 'Invalid subscription' };
    }
    // an endpoint belongs to one browser; if someone else logs in on it, it moves to them
    await this.subscriptions.updateOne(
      { endpoint },
      { $set: { userId, keys: { p256dh: keys.p256dh, auth: keys.auth }, userAgent: userAgent?.slice(0, 300) } },
      { upsert: true },
    );
    return { success: true, message: 'Device notifications on' };
  }

  async unsubscribe(userId: string, endpoint?: string) {
    if (endpoint) await this.subscriptions.deleteOne({ userId, endpoint });
    return { success: true, message: 'Device notifications off' };
  }
}
