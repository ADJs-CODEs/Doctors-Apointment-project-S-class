import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { DocId, DoctorAuthGuard, UserAuthGuard, UserId } from '../common/auth';
import { CallsService } from './calls.service';

/** The patient's side of calls. They can only start one during a paid video visit. */
@Controller('api/user/calls')
@UseGuards(UserAuthGuard)
export class PatientCallsController {
  constructor(private readonly calls: CallsService) {}

  @Post()
  @HttpCode(200)
  start(@UserId() id: string, @Body() body: any) {
    return this.calls.start({ side: 'patient', id }, body ?? {});
  }

  @Get('current')
  current(@UserId() id: string) {
    return this.calls.current({ side: 'patient', id });
  }

  @Get('history')
  history(@UserId() id: string) {
    return this.calls.history({ side: 'patient', id });
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@UserId() id: string, @Param('id') callId: string) {
    return this.calls.accept({ side: 'patient', id }, callId);
  }

  /** decline, cancel or hang up, whichever fits */
  @Post(':id/end')
  @HttpCode(200)
  end(@UserId() id: string, @Param('id') callId: string) {
    return this.calls.hangUp({ side: 'patient', id }, callId);
  }
}

/** The doctor's side: they can call any of their own patients at any time. */
@Controller('api/doctor/calls')
@UseGuards(DoctorAuthGuard)
export class DoctorCallsController {
  constructor(private readonly calls: CallsService) {}

  @Post()
  @HttpCode(200)
  start(@DocId() id: string, @Body() body: any) {
    return this.calls.start({ side: 'doctor', id }, body ?? {});
  }

  @Get('current')
  current(@DocId() id: string) {
    return this.calls.current({ side: 'doctor', id });
  }

  @Get('history')
  history(@DocId() id: string) {
    return this.calls.history({ side: 'doctor', id });
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@DocId() id: string, @Param('id') callId: string) {
    return this.calls.accept({ side: 'doctor', id }, callId);
  }

  @Post(':id/end')
  @HttpCode(200)
  end(@DocId() id: string, @Param('id') callId: string) {
    return this.calls.hangUp({ side: 'doctor', id }, callId);
  }
}
