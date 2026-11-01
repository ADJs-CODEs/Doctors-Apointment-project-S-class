import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { DocId, DoctorAuthGuard, UserAuthGuard, UserId } from '../common/auth';
import { MessagesService } from './messages.service';

// Doctor <-> patient chat. Each side lists its conversations, opens one (which marks it
// read and returns the context), and sends. "unread" feeds the badges.
// Fixed routes (unread) are declared before :id so they aren't read as an id.

@Controller('api/user/messages')
@UseGuards(UserAuthGuard)
export class PatientMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  conversations(@UserId() userId: string) {
    return this.messages.patientConversations(userId);
  }

  @Get('unread')
  unread(@UserId() userId: string) {
    return this.messages.patientUnread(userId);
  }

  @Get(':docId')
  thread(@UserId() userId: string, @Param('docId') docId: string) {
    return this.messages.patientThread(userId, docId);
  }

  @Post(':docId')
  @HttpCode(200)
  send(@UserId() userId: string, @Param('docId') docId: string, @Body() body: any) {
    return this.messages.patientSend(userId, docId, body ?? {});
  }

  @Post(':docId/read')
  @HttpCode(200)
  read(@UserId() userId: string, @Param('docId') docId: string) {
    return this.messages.patientRead(userId, docId);
  }
}

@Controller('api/doctor/messages')
@UseGuards(DoctorAuthGuard)
export class DoctorMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  conversations(@DocId() docId: string) {
    return this.messages.doctorConversations(docId);
  }

  @Get('unread')
  unread(@DocId() docId: string) {
    return this.messages.doctorUnread(docId);
  }

  @Get(':userId')
  thread(@DocId() docId: string, @Param('userId') userId: string) {
    return this.messages.doctorThread(docId, userId);
  }

  @Post(':userId')
  @HttpCode(200)
  send(@DocId() docId: string, @Param('userId') userId: string, @Body() body: any) {
    return this.messages.doctorSend(docId, userId, body ?? {});
  }

  @Post(':userId/read')
  @HttpCode(200)
  read(@DocId() docId: string, @Param('userId') userId: string) {
    return this.messages.doctorRead(docId, userId);
  }
}
