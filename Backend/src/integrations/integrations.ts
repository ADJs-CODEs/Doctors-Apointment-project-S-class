import { Global, Injectable, Logger, Module } from '@nestjs/common';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import * as nodemailer from 'nodemailer';
import { RealtimeGateway } from './realtime.gateway';

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** content is base64 */
  attachments?: { filename: string; content: string; type: string }[];
};

/**
 * Sends email through SendGrid (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL). Without a
 * SendGrid key it falls back to plain SMTP (SMTP_*), so local setups keep working.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  // Created lazily so a missing SMTP config only fails the email, not app startup.
  private transporter?: nodemailer.Transporter;

  private get smtp() {
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

  async send(mail: Mail): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromName = process.env.MAIL_FROM_NAME || "ADJ's CODEs";
    if (!apiKey) {
      await this.smtp.sendMail({
        from: `"${fromName}" <${process.env.SMTP_USER}>`,
        ...mail,
        attachments: mail.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          encoding: 'base64',
          contentType: a.type,
        })),
      });
      return;
    }

    try {
      await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: mail.to }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL, name: fromName },
          reply_to: mail.replyTo ? { email: mail.replyTo } : undefined,
          subject: mail.subject,
          content: [
            ...(mail.text ? [{ type: 'text/plain', value: mail.text }] : []),
            { type: 'text/html', value: mail.html },
          ],
          attachments: mail.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content,
            type: a.type,
            disposition: 'attachment',
          })),
        },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15_000 },
      );
    } catch (err: any) {
      // SendGrid explains rejections (unverified sender, bad key) in errors[].message
      const reason = err.response?.data?.errors?.map((e: any) => e.message).join('; ') || err.message;
      this.logger.error(`SendGrid rejected "${mail.subject}": ${reason}`);
      throw new Error(reason);
    }
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

@Global()
@Module({
  providers: [MailService, CloudinaryService, RealtimeGateway],
  exports: [MailService, CloudinaryService, RealtimeGateway],
})
export class IntegrationsModule {}
