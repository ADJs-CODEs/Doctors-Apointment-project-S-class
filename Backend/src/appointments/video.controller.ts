import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { DocId, DoctorAuthGuard, UserAuthGuard, UserId } from '../common/auth';
import { VideoService } from './video.service';

// Joining a video consultation: each side gets their own way into the same room.

@Controller('api/user/video')
@UseGuards(UserAuthGuard)
export class PatientVideoController {
  constructor(private readonly video: VideoService) {}

  @Post(':appointmentId/join')
  @HttpCode(200)
  join(@UserId() userId: string, @Param('appointmentId') appointmentId: string) {
    return this.video.join(appointmentId, { userId });
  }
}

@Controller('api/doctor/video')
@UseGuards(DoctorAuthGuard)
export class DoctorVideoController {
  constructor(private readonly video: VideoService) {}

  @Post(':appointmentId/join')
  @HttpCode(200)
  join(@DocId() docId: string, @Param('appointmentId') appointmentId: string) {
    return this.video.join(appointmentId, { docId });
  }
}
