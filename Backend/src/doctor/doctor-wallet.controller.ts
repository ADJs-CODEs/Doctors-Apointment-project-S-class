import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, DocId, DoctorAuthGuard } from '../common/auth';
import { DoctorEarningsService } from './doctor-earnings.service';

/** The doctor's Wallet page: what visits earned, the bank account, withdrawals. */
@Controller('api/doctor/wallet')
@UseGuards(DoctorAuthGuard)
export class DoctorWalletController {
  constructor(private readonly earnings: DoctorEarningsService) {}

  @Get()
  overview(@DocId() docId: string) {
    return this.earnings.overview(docId);
  }

  @Get('banks')
  banks() {
    return this.earnings.bankOptions();
  }

  @Put('bank')
  saveBank(@DocId() docId: string, @Body() body: any) {
    return this.earnings.saveBank(docId, body ?? {});
  }

  @Post('payouts')
  @HttpCode(200)
  requestPayout(@DocId() docId: string, @Body() body: any) {
    return this.earnings.requestPayout(docId, body ?? {});
  }
}

/** The admin's side: doctor withdrawals and the clinic's commission on visits. */
@Controller('api/admin')
@UseGuards(AdminAuthGuard)
export class AdminDoctorPayoutsController {
  constructor(private readonly earnings: DoctorEarningsService) {}

  @Get('doctor-payouts')
  payouts(@Query('status') status?: string) {
    return this.earnings.adminList(status);
  }

  @Post('doctor-payouts/:id/send')
  @HttpCode(200)
  send(@Param('id') id: string, @Body() body: any) {
    return this.earnings.send(id, body ?? {});
  }

  @Post('doctor-payouts/:id/paid')
  @HttpCode(200)
  markPaid(@Param('id') id: string, @Body() body: any) {
    return this.earnings.markPaid(id, body ?? {});
  }

  @Post('doctor-payouts/:id/reject')
  @HttpCode(200)
  reject(@Param('id') id: string, @Body() body: any) {
    return this.earnings.reject(id, body ?? {});
  }

  @Post('doctor-payouts/:id/refresh')
  @HttpCode(200)
  refresh(@Param('id') id: string) {
    return this.earnings.refresh(id);
  }

  @Get('doctor-commission')
  async commission() {
    return { success: true, percent: await this.earnings.commissionPercent() };
  }

  @Put('doctor-commission')
  setCommission(@Body() body: any) {
    return this.earnings.setCommission(body?.percent);
  }
}
