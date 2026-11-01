import { Body, Controller, Get, HttpCode, Post, UseFilters, UseGuards } from '@nestjs/common';
import { MissedAppointments } from '../appointments/missed-appointments';
import { DocId, DoctorAuthGuard } from '../common/auth';
import { DoctorService } from './doctor.service';
import { OkOnErrorFilter } from './ok-on-error.filter';

@Controller('api/doctor')
export class DoctorController {
  constructor(
    private readonly doctors: DoctorService,
    private readonly missed: MissedAppointments,
  ) {}

  @Get('list')
  @UseFilters(OkOnErrorFilter)
  list() {
    return this.doctors.list();
  }

  @Post('login')
  @HttpCode(200)
  @UseFilters(OkOnErrorFilter)
  login(@Body() body: any) {
    return this.doctors.login(body);
  }

  @Get('appointments')
  @UseGuards(DoctorAuthGuard)
  @UseFilters(OkOnErrorFilter)
  appointments(@DocId() docId: string) {
    return this.doctors.appointmentsFor(docId);
  }

  @Post('complete-appointment')
  @HttpCode(200)
  @UseGuards(DoctorAuthGuard)
  @UseFilters(OkOnErrorFilter)
  complete(@DocId() docId: string, @Body() body: any) {
    return this.doctors.complete(docId, body);
  }

  @Post('cancel-appointment')
  @HttpCode(200)
  @UseGuards(DoctorAuthGuard)
  @UseFilters(OkOnErrorFilter)
  cancel(@DocId() docId: string, @Body('appointmentId') appointmentId?: string) {
    return this.doctors.cancel(docId, appointmentId);
  }

  /** "Patient didn't show": 50% of a paid fee goes back to the patient. */
  @Post('mark-no-show')
  @HttpCode(200)
  @UseGuards(DoctorAuthGuard)
  @UseFilters(OkOnErrorFilter)
  markNoShow(@DocId() docId: string, @Body('appointmentId') appointmentId?: string) {
    return this.missed.markMissed(appointmentId, 'patient', 'doctor', docId);
  }

  @Get('dashboard')
  @UseGuards(DoctorAuthGuard)
  @UseFilters(OkOnErrorFilter)
  dashboard(@DocId() docId: string) {
    return this.doctors.dashboard(docId);
  }

  @Get('profile')
  @UseGuards(DoctorAuthGuard)
  @UseFilters(OkOnErrorFilter)
  profile(@DocId() docId: string) {
    return this.doctors.profile(docId);
  }

  @Post('update-profile')
  @HttpCode(200)
  @UseGuards(DoctorAuthGuard)
  @UseFilters(OkOnErrorFilter)
  updateProfile(@DocId() docId: string, @Body() body: any) {
    return this.doctors.updateProfile(docId, body);
  }

  @Post('send-alert')
  @HttpCode(200)
  @UseGuards(DoctorAuthGuard)
  sendAlert(@DocId() docId: string, @Body() body: any) {
    return this.doctors.sendPatientAlert(docId, body);
  }
}
