import { Controller, Headers, HttpCode, Logger, Post, type RawBodyRequest, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PharmacyEarningsService } from '../pharmacy/earnings.service';
import { WalletService } from '../wallet/wallet.service';
import { PaystackService } from './paystack.service';

/**
 * Paystack tells us how a transfer ended (care-fund or pharmacy withdrawals). Set the webhook URL in the Paystack
 * dashboard (Settings → API Keys & Webhooks) to https://<backend>/api/paystack/webhook.
 */
@Controller('api/paystack')
export class PaystackWebhookController {
  private readonly logger = new Logger('PaystackWebhook');

  constructor(
    private readonly paystack: PaystackService,
    private readonly wallet: WalletService,
    private readonly pharmacyEarnings: PharmacyEarningsService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handle(@Req() req: RawBodyRequest<Request>, @Headers('x-paystack-signature') signature?: string) {
    // proves it really came from Paystack and wasn't changed
    if (!this.paystack.validSignature(req.rawBody ?? Buffer.alloc(0), signature)) {
      this.logger.warn('rejected webhook with a bad signature');
      req.res?.status(400);
      return { received: false };
    }
    const { event, data } = (req.body ?? {}) as { event?: string; data?: { reference?: string; reason?: string } };
    const outcome = { 'transfer.success': 'success', 'transfer.failed': 'failed', 'transfer.reversed': 'reversed' }[event ?? ''];
    if (outcome && data?.reference) {
      // pharmacy withdrawals and care-fund withdrawals are told apart by their reference
      if (PharmacyEarningsService.isOurReference(data.reference)) {
        await this.pharmacyEarnings.completeTransfer(data.reference, outcome, data.reason);
      } else {
        await this.wallet.completeTransfer(data.reference, outcome, data.reason);
      }
    }
    return { received: true };
  }
}
