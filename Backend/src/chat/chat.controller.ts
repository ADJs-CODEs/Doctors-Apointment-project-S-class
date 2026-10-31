import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { DoctorAuthGuard, UserAuthGuard, UserId } from '../common/auth';
import { ChatService } from './chat.service';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('message')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  patient(@UserId() userId: string, @Body() body: any) {
    return this.chat.patientChat(userId, body);
  }

  @Post('doctor-message')
  @HttpCode(200)
  @UseGuards(DoctorAuthGuard)
  doctor(@Body() body: any) {
    return this.chat.doctorChat(body);
  }
}
