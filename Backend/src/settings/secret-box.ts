import * as crypto from 'crypto';

// Encrypts third-party tokens (e.g. a Google refresh token) before they're stored, so a
// leaked database dump alone can't be used to read someone's calendar.
// Key: INTEGRATIONS_KEY (any long random string), else derived from JWT_SECRET.

const key = () =>
  crypto
    .createHash('sha256')
    .update(process.env.INTEGRATIONS_KEY || `integrations:${process.env.JWT_SECRET ?? ''}`)
    .digest();

/** -> "iv.tag.ciphertext" (base64url), AES-256-GCM */
export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function open(sealed: string): string {
  const [iv, tag, data] = sealed.split('.').map((s) => Buffer.from(s, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
