import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import type { Model } from 'mongoose';
import { DocId, DoctorAuthGuard } from '../common/auth';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IDoctor } from '../database/schemas/doctor.schema';
import { MapsService } from '../maps/maps.service';
import { DoctorPreferences, normalizeDoctorSettings } from '../settings/doctor-preferences';
import { GoogleCalendar } from '../settings/google-calendar';

/**
 * The doctor's Settings tab: taking bookings, email choices and quiet hours, password,
 * and connected apps (Google Calendar, and where Google Maps puts the clinic). Hours and
 * fees keep their own endpoint (/api/doctor/schedule).
 */
@Controller('api/doctor/settings')
@UseGuards(DoctorAuthGuard)
export class DoctorSettingsController {
  constructor(
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    private readonly prefs: DoctorPreferences,
    private readonly calendar: GoogleCalendar,
    private readonly maps: MapsService,
  ) {}

  @Get()
  async get(@DocId() docId: string) {
    const doctor = await this.doctors.findById(docId).select(['available', 'settings', 'googleCalendar', 'address', 'geo', 'email']);
    if (!doctor) fail('Doctor not found', HttpStatus.NOT_FOUND);
    return {
      success: true,
      available: doctor.available,
      email: doctor.email,
      settings: normalizeDoctorSettings(doctor.settings),
      calendar: this.calendar.status(doctor),
      map: this.mapView(doctor),
    };
  }

  /** { available?, settings? }: only what's sent changes. */
  @Put()
  async save(@DocId() docId: string, @Body() body: { available?: unknown; settings?: unknown }) {
    const set: Record<string, unknown> = {};
    if (typeof body.available === 'boolean') set.available = body.available;
    if (body.settings !== undefined) set.settings = normalizeDoctorSettings(body.settings);
    if (!Object.keys(set).length) fail('Nothing to save');
    const doctor = await this.doctors.findByIdAndUpdate(docId, { $set: set }, { returnDocument: 'after' }).select(['available', 'settings']);
    if (!doctor) fail('Doctor not found', HttpStatus.NOT_FOUND);
    this.prefs.forget(docId);
    return { success: true, message: 'Saved', available: doctor.available, settings: normalizeDoctorSettings(doctor.settings) };
  }

  @Post('change-password')
  @HttpCode(200)
  async changePassword(@DocId() docId: string, @Body() body: { currentPassword?: string; newPassword?: string }) {
    const doctor = await this.doctors.findById(docId).select('password');
    if (!doctor || !(await bcrypt.compare(body.currentPassword ?? '', doctor.password))) fail('Your current password is wrong');
    if (!body.newPassword || body.newPassword.length < 8) fail('Use at least 8 characters');
    if (body.newPassword === body.currentPassword) fail('Pick a different password');
    await this.doctors.updateOne(
      { _id: docId },
      { $set: { password: await bcrypt.hash(body.newPassword, await bcrypt.genSalt(10)) }, $unset: { mustChangePassword: 1 } },
    );
    return { success: true, message: 'Password changed' };
  }

  // --- connected apps ---

  @Post('google-calendar/connect')
  @HttpCode(200)
  async connectCalendar(@DocId() docId: string, @Body('code') code?: string) {
    const result = await this.calendar.connectDoctor(docId, code);
    const synced = await this.calendar.syncDoctorUpcoming(docId);
    return { ...result, message: `${result.message}. ${synced.message}.` };
  }

  @Post('google-calendar/sync')
  @HttpCode(200)
  syncCalendar(@DocId() docId: string) {
    return this.calendar.syncDoctorUpcoming(docId);
  }

  @Post('google-calendar/disconnect')
  @HttpCode(200)
  disconnectCalendar(@DocId() docId: string) {
    return this.calendar.disconnectDoctor(docId);
  }

  /** Look the clinic address up on the map again (after fixing it, or if the pin looks wrong). */
  @Post('map/refresh')
  @HttpCode(200)
  async refreshMap(@DocId() docId: string) {
    const doctor = await this.doctors.findById(docId);
    if (!doctor) fail('Doctor not found', HttpStatus.NOT_FOUND);
    const geo = await this.maps.clinicLocation(doctor, true);
    const fresh = await this.doctors.findById(docId).select(['address', 'geo']);
    return {
      success: true,
      message: geo ? 'Found your clinic on the map' : "We couldn't find that address on the map. Add the area and city in My Profile.",
      map: this.mapView(fresh!),
    };
  }

  private mapView(doctor: Pick<IDoctor, 'address' | 'geo'>) {
    const address = [doctor.address?.line1, doctor.address?.line2].filter(Boolean).join(', ');
    const geo = doctor.geo && doctor.geo.address === address ? doctor.geo : undefined;
    return {
      address,
      located: !!geo,
      lat: geo?.lat,
      lng: geo?.lng,
      // a precise Google point vs a rough OpenStreetMap one (no Maps key on the server yet)
      precise: geo?.source === 'google',
      googleMapsKey: !!process.env.GOOGLE_MAPS_API_KEY,
    };
  }
}
