import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios, { type AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { fail } from '../common/http';

export type Bank = { name: string; code: string };

/**
 * Paystack: sends care-fund withdrawals to Nigerian bank accounts.
 *  - lists banks and confirms the account holder's name before anything is sent
 *  - creates a transfer recipient and a transfer from the Paystack balance
 *  - its webhook (payments/paystack-webhook.controller.ts) reports success/failure
 * Needs PAYSTACK_SECRET_KEY; without it the app keeps the manual payout flow. In the
 * Paystack dashboard, transfers must be enabled and the transfer OTP turned off so the
 * API can send them.
 */
@Injectable()
export class PaystackService {
  private readonly logger = new Logger('Paystack');
  private banksCache?: { at: number; banks: Bank[] };

  get configured() {
    return !!process.env.PAYSTACK_SECRET_KEY;
  }

  private get api(): AxiosInstance {
    return axios.create({
      baseURL: 'https://api.paystack.co',
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      timeout: 15_000,
    });
  }

  private reason(err: any) {
    return err.response?.data?.message ?? err.message;
  }

  /** Nigerian banks that can receive transfers (cached for a day). */
  async banks(): Promise<Bank[]> {
    if (!this.configured) return [];
    if (this.banksCache && Date.now() - this.banksCache.at < 24 * 60 * 60_000) return this.banksCache.banks;
    try {
      const { data } = await this.api.get('/bank', { params: { country: 'nigeria', currency: 'NGN', perPage: 200 } });
      const banks: Bank[] = (data.data ?? [])
        .filter((b: any) => b.active !== false && !b.is_deleted)
        .map((b: any) => ({ name: b.name, code: b.code }));
      this.banksCache = { at: Date.now(), banks };
      return banks;
    } catch (err) {
      this.logger.warn(`bank list failed: ${this.reason(err)}`);
      return this.banksCache?.banks ?? [];
    }
  }

  /** The account holder's name as the bank has it, e.g. "TUNDE ADEYEMI". */
  async resolveAccount(accountNumber: string, bankCode: string) {
    if (!this.configured) fail('Account checking is not set up yet', HttpStatus.SERVICE_UNAVAILABLE);
    if (!/^\d{10}$/.test(accountNumber)) fail('Nigerian account numbers have 10 digits');
    try {
      const { data } = await this.api.get('/bank/resolve', { params: { account_number: accountNumber, bank_code: bankCode } });
      return data.data.account_name as string;
    } catch (err) {
      this.logger.warn(`resolve failed: ${this.reason(err)}`);
      fail("We couldn't find that account. Check the bank and number.");
    }
  }

  /** Sends money (in kobo) to an account. Returns Paystack's transfer status. */
  async transfer(p: { name: string; accountNumber: string; bankCode: string; amountKobo: number; reference: string; reason: string }) {
    if (!this.configured) fail('Paystack is not set up', HttpStatus.SERVICE_UNAVAILABLE);
    try {
      const { data: recipient } = await this.api.post('/transferrecipient', {
        type: 'nuban',
        name: p.name,
        account_number: p.accountNumber,
        bank_code: p.bankCode,
        currency: 'NGN',
      });
      const { data } = await this.api.post('/transfer', {
        source: 'balance',
        amount: p.amountKobo,
        recipient: recipient.data.recipient_code,
        reason: p.reason.slice(0, 100),
        // our id: retrying with the same reference can't send the money twice
        reference: p.reference,
      });
      return { status: data.data.status as string, transferCode: data.data.transfer_code as string };
    } catch (err) {
      const reason = this.reason(err);
      this.logger.error(`transfer ${p.reference} failed: ${reason}`);
      fail(`Paystack refused the transfer: ${reason}`, HttpStatus.BAD_GATEWAY);
    }
  }

  /** Current status of a transfer by our reference (for "check again"). */
  async verify(reference: string) {
    const { data } = await this.api.get(`/transfer/verify/${encodeURIComponent(reference)}`);
    return { status: data.data.status as string, reason: data.data.reason as string | undefined };
  }

  /** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
  validSignature(rawBody: Buffer, signature?: string) {
    if (!this.configured || !signature) return false;
    const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY as string).update(rawBody).digest('hex');
    return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}

/** Care funds are kept in CURRENCY (cents); Paystack pays NGN (kobo). */
export function toPayoutKobo(cents: number) {
  const fundCurrency = (process.env.CURRENCY || 'usd').toLowerCase();
  if (fundCurrency === 'ngn') return cents; // 1 kobo = 1/100 naira, same as cents
  const rate = Number(process.env.PAYOUT_USD_NGN_RATE);
  if (!Number.isFinite(rate) || rate <= 0) return null; // no rate set: can't convert
  return Math.floor(cents * rate);
}

/** Loose check that the bank's account name matches the patient (any shared name part). */
export function namesMatch(a = '', b = '') {
  const parts = (s: string) => new Set(s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1));
  const pa = parts(a);
  return [...parts(b)].some((w) => pa.has(w));
}
