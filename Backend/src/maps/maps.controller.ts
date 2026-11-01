import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { UserAuthGuard, UserId } from '../common/auth';
import { MapsService } from './maps.service';

// Logged-in only: each call can cost a Google Routes request, so it isn't open to anyone.
@Controller('api/maps')
@UseGuards(UserAuthGuard)
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  /** { docId, origin?: { lat, lng }, mode? } -> distance and travel time to that clinic */
  @Post('distance')
  @HttpCode(200)
  distance(@UserId() userId: string, @Body() body: any) {
    return this.maps.distanceToDoctor(userId, body ?? {});
  }
}
