import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { UserAuthGuard, UserId } from '../common/auth';
import { ConnectionsService } from './connections.service';

@Controller('api/connections')
@UseGuards(UserAuthGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Post('request')
  request(@UserId() userId: string, @Body('patientEmail') patientEmail?: string) {
    return this.connections.request(userId, patientEmail);
  }

  @Post('respond')
  @HttpCode(200)
  respond(@UserId() userId: string, @Body() body: any) {
    return this.connections.respond(userId, body);
  }

  @Get('my-requests')
  myRequests(@UserId() userId: string) {
    return this.connections.pendingRequests(userId);
  }

  @Get('watching-over')
  watchingOver(@UserId() userId: string) {
    return this.connections.watchingOver(userId);
  }

  @Get('my-watchers')
  myWatchers(@UserId() userId: string) {
    return this.connections.watchers(userId);
  }

  @Post('remove')
  @HttpCode(200)
  remove(@UserId() userId: string, @Body('connectionId') connectionId?: string) {
    return this.connections.remove(userId, connectionId);
  }

  @Get('patient/:patientId')
  patient(@UserId() userId: string, @Param('patientId') patientId: string) {
    return this.connections.patientData(userId, patientId);
  }
}
