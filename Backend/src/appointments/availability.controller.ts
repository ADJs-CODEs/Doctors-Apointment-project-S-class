import { Body, Controller, Get, HttpStatus, Param, Put, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model } from 'mongoose';
import { DocId, DoctorAuthGuard } from '../common/auth';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IDoctor, VisitKind } from '../database/schemas/doctor.schema';
import { DEFAULT_AVAILABILITY, freeSlots, normalizeAvailability, offers } from './availability';
import { BookingService } from './booking.service';

/** Public: a doctor's free times for clinic visits or video calls. */
@Controller('api/availability')
export class AvailabilityController {
  constructor(
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    private readonly booking: BookingService,
  ) {}

  @Get(':docId')
  async slots(@Param('docId') docId: string, @Query('kind') kindParam?: string) {
    if (!isValidObjectId(docId)) fail('Doctor not found', HttpStatus.NOT_FOUND);
    await this.booking.expireHolds(docId);
    const doctor = await this.doctors.findById(docId).select(['available', 'fees', 'videoFees', 'availability', 'slots_booked']);
    if (!doctor) fail('Doctor not found', HttpStatus.NOT_FOUND);
    const kind: VisitKind = kindParam === 'video' ? 'video' : 'in-person';
    return {
      success: true,
      kind,
      available: doctor.available,
      offersInPerson: offers(doctor, 'in-person'),
      offersVideo: offers(doctor, 'video'),
      fees: doctor.fees,
      videoFees: doctor.videoFees ?? null,
      days: doctor.available ? freeSlots(doctor, kind) : [],
    };
  }
}

/** The doctor's own hours, days off and video fee. */
@Controller('api/doctor/schedule')
@UseGuards(DoctorAuthGuard)
export class DoctorScheduleController {
  constructor(@InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>) {}

  @Get()
  async get(@DocId() docId: string) {
    const doctor = await this.doctors.findById(docId).select(['fees', 'videoFees', 'availability']).lean();
    if (!doctor) fail('Doctor not found', HttpStatus.NOT_FOUND);
    return {
      success: true,
      fees: doctor.fees,
      videoFees: doctor.videoFees ?? null,
      // doctors who never set hours get the old defaults to start from
      availability: doctor.availability ? normalizeAvailability(doctor.availability) : DEFAULT_AVAILABILITY,
      isDefault: !doctor.availability,
    };
  }

  @Put()
  async save(@DocId() docId: string, @Body() body: { availability?: unknown; videoFees?: unknown }) {
    const availability = normalizeAvailability(body.availability);
    const videoFees = body.videoFees === null || body.videoFees === '' ? null : Number(body.videoFees);
    if (videoFees !== null && (!Number.isFinite(videoFees) || videoFees < 0 || videoFees > 100000)) {
      fail('Enter a valid video call fee');
    }
    if (availability.weekly.some((w) => w.kinds.includes('video')) && !videoFees) {
      fail('Set a video call fee to offer video call hours');
    }
    await this.doctors.updateOne(
      { _id: docId },
      videoFees === null ? { $set: { availability }, $unset: { videoFees: 1 } } : { $set: { availability, videoFees } },
    );
    return { success: true, message: 'Hours saved', availability, videoFees };
  }
}
