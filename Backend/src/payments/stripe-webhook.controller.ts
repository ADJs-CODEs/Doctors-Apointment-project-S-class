import { Controller, Headers, HttpCode, Logger, Post, type RawBodyRequest, Req } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { BookingService } from '../appointments/booking.service';
import { WalletService } from '../wallet/wallet.service';

/**
 * Stripe tells us directly when a checkout is paid, so a payment never depends on the
 * patient's browser coming back to the site. Handles appointment payments (holds become
 * bookings) and coin top-ups. Both paths are idempotent with the "return to site" ones.
 *
 * Set up in the Stripe dashboard: Developers → Webhooks → endpoint
 * https://<backend>/api/stripe/webhook, events checkout.session.completed and
 * checkout.session.async_payment_succeeded; put its signing secret in STRIPE_WEBHOOK_SECRET.
 */
@Controller('api/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger('StripeWebhook');
  private stripeClient?: Stripe;

  constructor(
    private readonly booking: BookingService,
    private readonly wallet: WalletService,
  ) {}

  private get stripe() {
    this.stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY as string);
    return this.stripeClient;
  }

  @Post('webhook')
  @HttpCode(200)
  async handle(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('webhook received but STRIPE_WEBHOOK_SECRET is not set; ignoring');
      return { received: false };
    }

    let event: Stripe.Event;
    try {
      // proves the request really came from Stripe and wasn't changed
      event = this.stripe.webhooks.constructEvent(req.rawBody ?? Buffer.alloc(0), signature ?? '', secret);
    } catch (err: any) {
      this.logger.warn(`rejected webhook: ${err.message}`);
      // 400 tells Stripe it was refused (it won't be retried as a success)
      req.res?.status(400);
      return { received: false };
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        try {
          if (session.metadata?.kind === 'coins') {
            await this.wallet.creditTopup(session);
          } else if (session.metadata?.appointmentId) {
            await this.booking.markStripePaid(session);
          }
        } catch (err: any) {
          // a 500 makes Stripe retry later, which is what we want if something failed
          this.logger.error(`handling ${event.type} for ${session.id} failed: ${err.message}`);
          throw err;
        }
      }
    }
    return { received: true };
  }
}
