import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { isValidObjectId, type Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IDoctor } from '../database/schemas/doctor.schema';
import { Preferences } from '../settings/preferences';

type LatLng = { lat: number; lng: number };
type Mode = 'driving' | 'walking' | 'transit' | 'bicycling';

const ROUTES_MODE: Record<Mode, string> = { driving: 'DRIVE', walking: 'WALK', transit: 'TRANSIT', bicycling: 'BICYCLE' };

const validPoint = (p: any): p is LatLng =>
  p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

/** Straight-line ("as the crow flies") distance in metres. */
function haversine(a: LatLng, b: LatLng) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Distance and travel time from a patient to a clinic.
 *  - With GOOGLE_MAPS_API_KEY (server-only): Google Geocoding finds the clinic, and the
 *    Routes API gives the real road distance and time (traffic-aware when driving).
 *  - Without it: OpenStreetMap (Nominatim) finds the clinic and we return the
 *    straight-line distance, so the feature still works before a key is added.
 * A clinic is geocoded once and saved on the doctor. The patient's location is only
 * used for the calculation; it's never stored.
 */
@Injectable()
export class MapsService {
  private readonly logger = new Logger('Maps');
  private lastOsmCall = 0;

  constructor(
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
    private readonly prefs: Preferences,
  ) {}

  private get key() {
    return process.env.GOOGLE_MAPS_API_KEY;
  }

  /** Address text -> coordinates, or null if it can't be found. */
  async geocode(address: string): Promise<(LatLng & { source: 'google' | 'osm' }) | null> {
    if (!address.trim()) return null;
    try {
      if (this.key) {
        const { data } = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: { address, key: this.key },
          timeout: 8000,
        });
        const loc = data.results?.[0]?.geometry?.location;
        if (loc) return { lat: loc.lat, lng: loc.lng, source: 'google' };
        if (data.status !== 'ZERO_RESULTS') this.logger.warn(`Google geocoding: ${data.status} ${data.error_message ?? ''}`);
        return null;
      }
      // Nominatim's rules: at most 1 request a second, and say who we are
      const wait = 1100 - (Date.now() - this.lastOsmCall);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastOsmCall = Date.now();
      // identify the app by its site; Nominatim refuses placeholder contacts like example.com
      const site = process.env.USER_URL || process.env.CLIENT_URL || 'https://srankadjsapp.vercel.app';
      const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: address, format: 'json', limit: 1, ...(process.env.ADMIN_EMAIL && { email: process.env.ADMIN_EMAIL }) },
        headers: { 'User-Agent': `ADJsCODEs-clinic-finder/1.0 (+${site})` },
        timeout: 8000,
      });
      const hit = data?.[0];
      return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), source: 'osm' } : null;
    } catch (err: any) {
      this.logger.warn(`geocoding "${address}" failed: ${err.message}`);
      return null;
    }
  }

  /** The clinic's coordinates, looked up once per address and saved on the doctor. */
  private async clinicLocation(doctor: IDoctor) {
    const address = [doctor.address?.line1, doctor.address?.line2].filter(Boolean).join(', ');
    if (!address) return null;
    // reuse the saved point unless the address changed (or it was a rough OSM point and we now have Google)
    if (doctor.geo && doctor.geo.address === address && !(this.key && doctor.geo.source === 'osm')) {
      return { ...doctor.geo, address };
    }
    const found = await this.geocode(address);
    if (!found) return null;
    const geo = { lat: found.lat, lng: found.lng, address, source: found.source, at: new Date() };
    await this.doctors.updateOne({ _id: doctor._id }, { $set: { geo } });
    return geo;
  }

  /**
   * How far a doctor's clinic is from the patient: from the coordinates their browser
   * sent, or (if none) from the home address in their settings.
   */
  async distanceToDoctor(userId: string, body: { docId?: string; origin?: LatLng; mode?: Mode }) {
    if (!body.docId || !isValidObjectId(body.docId)) fail('Doctor not found', HttpStatus.NOT_FOUND);
    const doctor = await this.doctors.findById(body.docId).select(['name', 'address', 'geo']);
    if (!doctor) fail('Doctor not found', HttpStatus.NOT_FOUND);

    const settings = await this.prefs.get(userId);
    const mode: Mode = body.mode && body.mode in ROUTES_MODE ? body.mode : settings.maps.travelMode;

    let origin: LatLng | null = null;
    let from: 'current' | 'home' = 'current';
    if (body.origin !== undefined) {
      if (!validPoint(body.origin)) fail('That location looks wrong');
      origin = { lat: body.origin.lat, lng: body.origin.lng };
    } else if (settings.maps.homeAddress) {
      origin = await this.geocode(settings.maps.homeAddress);
      from = 'home';
      if (!origin) fail("We couldn't find your home address on the map. Check it in Settings.");
    } else {
      fail('Share your location, or add a home address in Settings');
    }

    const clinic = await this.clinicLocation(doctor);
    if (!clinic) fail("We couldn't find this clinic on the map");

    const straight = Math.round(haversine(origin, clinic));
    const base = {
      success: true,
      from,
      mode,
      clinic: { lat: clinic.lat, lng: clinic.lng, address: clinic.address },
      straightLineMeters: straight,
    };

    if (!this.key) return { ...base, kind: 'straight-line' as const, distanceMeters: straight, durationSeconds: null };

    try {
      const { data } = await axios.post(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: clinic.lat, longitude: clinic.lng } } },
          travelMode: ROUTES_MODE[mode],
          ...(mode === 'driving' && { routingPreference: 'TRAFFIC_AWARE' }),
        },
        {
          headers: {
            'X-Goog-Api-Key': this.key,
            // only ask for what we show (Google bills by the fields requested)
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
          },
          timeout: 8000,
        },
      );
      const route = data.routes?.[0];
      if (!route) return { ...base, kind: 'straight-line' as const, distanceMeters: straight, durationSeconds: null, note: 'No route found for this way of travelling' };
      return {
        ...base,
        kind: 'route' as const,
        distanceMeters: route.distanceMeters ?? straight,
        durationSeconds: route.duration ? Number(String(route.duration).replace('s', '')) : null,
        traffic: mode === 'driving',
      };
    } catch (err: any) {
      this.logger.warn(`route failed: ${err.response?.data?.error?.message ?? err.message}`);
      return { ...base, kind: 'straight-line' as const, distanceMeters: straight, durationSeconds: null };
    }
  }
}
