import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, UserAuthGuard, UserId } from '../common/auth';
import { BookingService } from '../appointments/booking.service';
import { WalletService } from './wallet.service';

@Controller('api/wallet')
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly booking: BookingService,
  ) {}

  // public: what gifts exist, and recent big gifts for the Wish Well banner
  @Get('catalog')
  catalog() {
    return this.wallet.catalog();
  }

  @Get('recent-gifts')
  recentGifts() {
    return this.wallet.recentBigGifts();
  }

  @Get()
  @UseGuards(UserAuthGuard)
  overview(@UserId() userId: string) {
    return this.wallet.overview(userId);
  }

  @Post('topup')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  topup(@UserId() userId: string, @Body('packId') packId?: string) {
    return this.wallet.startTopup(userId, packId);
  }

  @Post('topup/verify')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  verifyTopup(@UserId() userId: string, @Body('session_id') sessionId?: string) {
    return this.wallet.verifyTopup(userId, sessionId);
  }

  @Post('gift')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  gift(@UserId() userId: string, @Body() body: any) {
    return this.wallet.sendGift(userId, body ?? {});
  }

  @Post('pay-appointment')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  payAppointment(@UserId() userId: string, @Body('appointmentId') appointmentId?: string) {
    // paying a held slot also confirms the booking
    return this.booking.payFromWallet(userId, appointmentId);
  }

  /** Banks (Paystack) and the naira rate, for the withdrawal form */
  @Get('payout-options')
  @UseGuards(UserAuthGuard)
  payoutOptions() {
    return this.wallet.payoutOptions();
  }

  @Post('resolve-account')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  resolveAccount(@Body() body: any) {
    return this.wallet.resolveAccount(body ?? {});
  }

  @Post('payout')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  payout(@UserId() userId: string, @Body() body: any) {
    return this.wallet.requestPayout(userId, body ?? {});
  }
}

/** Care fund withdrawals, handled by the clinic admin. */
@Controller('api/admin/payouts')
@UseGuards(AdminAuthGuard)
export class AdminPayoutsController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.wallet.listPayouts(status);
  }

  @Post(':id/paid')
  @HttpCode(200)
  paid(@Param('id') id: string, @Body() body: any) {
    return this.wallet.markPayoutPaid(id, body ?? {});
  }

  /** send through Paystack (verified bank account) */
  @Post(':id/send')
  @HttpCode(200)
  send(@Param('id') id: string, @Body() body: any) {
    return this.wallet.sendPayout(id, body ?? {});
  }

  @Post(':id/refresh')
  @HttpCode(200)
  refresh(@Param('id') id: string) {
    return this.wallet.refreshPayout(id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(@Param('id') id: string, @Body() body: any) {
    return this.wallet.rejectPayout(id, body ?? {});
  }
}
