import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MissedAppointments } from '../appointments/missed-appointments';
import { AdminAuthGuard } from '../common/auth';
import { ImageUpload } from '../common/upload';
import { DoctorService } from '../doctor/doctor.service';
import { OkOnErrorFilter } from '../doctor/ok-on-error.filter';
import { AdminService } from './admin.service';

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly doctors: DoctorService,
    private readonly missed: MissedAppointments,
  ) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: any) {
    return this.admin.login(body);
  }

  @Post('add-doctor')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(ImageUpload())
  addDoctor(@Body() body: any, @UploadedFile() image?: Express.Multer.File) {
    return this.admin.addDoctor(body, image?.path);
  }

  // POST rather than GET only because the admin panel already calls it that way.
  @Post('all-doctors')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard)
  allDoctors() {
    return this.admin.allDoctors();
  }

  @Post('change-availability')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard)
  @UseFilters(OkOnErrorFilter)
  changeAvailability(@Body('docId') docId?: string) {
    return this.doctors.changeAvailability(docId);
  }

  @Get('appointments')
  @UseGuards(AdminAuthGuard)
  appointments() {
    return this.admin.allAppointments();
  }

  @Post('cancel-appointment')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard)
  cancelAppointment(@Body('appointmentId') appointmentId?: string) {
    return this.admin.cancelAppointment(appointmentId);
  }

  /** by = 'patient' (50% refund) or 'doctor' (100% refund). */
  @Post('mark-missed')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard)
  markMissed(@Body('appointmentId') appointmentId?: string, @Body('by') by?: 'patient' | 'doctor') {
    return this.missed.markMissed(appointmentId, by as 'patient' | 'doctor', 'admin');
  }

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  dashboard() {
    return this.admin.dashboard();
  }

  @Post('delete-doctor')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard)
  deleteDoctor(@Body('docId') docId?: string) {
    return this.admin.deleteDoctor(docId);
  }
}
