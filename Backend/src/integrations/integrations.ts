import { Global, Injectable, Logger, Module } from '@nestjs/common';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import * as nodemailer from 'nodemailer';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class MailService {
  // Created lazily so a missing SMTP config only fails the email, not app startup.
  private transporter?: nodemailer.Transporter;

  private get mailer() {
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT);
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        // 465 is implicit TLS; 587 upgrades with STARTTLS
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
    return this.transporter;
  }

  send(mail: { to: string; subject: string; html: string; text?: string; replyTo?: string }) {
    return this.mailer.sendMail({ from: process.env.SMTP_USER, ...mail });
  }
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger('Cloudinary');
  private configured = false;

  private configure() {
    if (this.configured) return;
    const { CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      this.logger.error('Cloudinary environment variables are missing');
    }
    cloudinary.config({
      cloud_name: CLOUDINARY_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
    this.configured = true;
  }

  /** Uploads a local file and returns its public https URL. */
  async uploadImage(path: string): Promise<string> {
    this.configure();
    const result = await cloudinary.uploader.upload(path, { resource_type: 'image' });
    return result.secure_url;
  }
}

/** Optional n8n automations (emails, reminders). Each is skipped when its env var is unset. */
export type WebhookName =
  | 'N8N_SIGNUP_WEBHOOK'
  | 'N8N_LOGIN_WEBHOOK'
  | 'N8N_BOOKING_WEBHOOK'
  | 'N8N_CANCEL_WEBHOOK'
  | 'N8N_OVERDOSE_WEBHOOK'
  | 'N8N_DOSE_REMINDER_WEBHOOK';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger('Webhooks');

  /** Fire-and-forget: a failing automation must never fail the user's request. */
  trigger(name: WebhookName, payload: Record<string, unknown>) {
    const url = process.env[name];
    if (!url) return;
    axios.post(url, payload).catch((err) => this.logger.warn(`${name} failed: ${err.message}`));
  }
}

@Global()
@Module({
  providers: [MailService, CloudinaryService, WebhookService, RealtimeGateway],
  exports: [MailService, CloudinaryService, WebhookService, RealtimeGateway],
})
export class IntegrationsModule {}
