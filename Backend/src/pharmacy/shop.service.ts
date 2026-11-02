import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model, Types } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import { type IPharmacy, type IProduct, PRODUCT_CATEGORIES } from '../database/schemas/pharmacy.schemas';
import { MapsService } from '../maps/maps.service';
import { productView } from './product.service';

// pharmacies further than this are never considered, whatever radius they claim
const MAX_SEARCH_METERS = 100_000;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** "Amoxicillin 500mg caps" -> ["amoxicillin"]: the words that identify a medicine */
export const keyWords = (s = '') =>
  s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !['tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'cream', 'injection'].includes(w));

type Nearby = Pick<IPharmacy, 'name' | 'address' | 'deliveryRadiusKm' | 'deliveryFeeCents' | 'operatedByClinic' | 'phone'> & {
  _id: Types.ObjectId;
  distanceMeters: number;
};

/**
 * The patient's side of the medicine shop. Only approved pharmacies whose delivery area
 * reaches the patient are shown, nearest first; products that are out of stock still show
 * (marked) so patients know the pharmacy carries them.
 */
@Injectable()
export class ShopService {
  constructor(
    @InjectModel(MODEL.pharmacy) private readonly pharmacies: Model<IPharmacy>,
    @InjectModel(MODEL.product) private readonly products: Model<IProduct>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly maps: MapsService,
  ) {}

  /** Approved pharmacies that deliver to this point, nearest first. */
  async reachable(point: { lat: number; lng: number }): Promise<Nearby[]> {
    return this.pharmacies.aggregate<Nearby>([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [point.lng, point.lat] },
          distanceField: 'distanceMeters',
          maxDistance: MAX_SEARCH_METERS,
          query: { status: 'approved' },
          spherical: true,
        },
      },
      // inside that pharmacy's own delivery distance
      { $match: { $expr: { $lte: ['$distanceMeters', { $multiply: ['$deliveryRadiusKm', 1000] }] } } },
      { $project: { name: 1, address: 1, phone: 1, deliveryRadiusKm: 1, deliveryFeeCents: 1, operatedByClinic: 1, distanceMeters: 1 } },
    ]);
  }

  /**
   * The shop: products from pharmacies that deliver to the patient.
   * body: { origin?: {lat,lng}, q?, category?, pharmacyId? }
   */
  async browse(userId: string, body: { origin?: unknown; q?: string; category?: string; pharmacyId?: string }) {
    const { point, from } = await this.maps.patientOrigin(userId, body.origin);
    const nearby = await this.reachable(point);
    const prescribed = await this.prescribedWords(userId);
    const base = { success: true, from, categories: PRODUCT_CATEGORIES };
    if (!nearby.length) return { ...base, pharmacies: [], products: [] };

    let ids = nearby.map((p) => p._id);
    if (body.pharmacyId) {
      if (!isValidObjectId(body.pharmacyId) || !ids.some((id) => String(id) === body.pharmacyId)) {
        fail("That pharmacy doesn't deliver to you", HttpStatus.NOT_FOUND);
      }
      ids = [new Types.ObjectId(body.pharmacyId)];
    }

    const filter: Record<string, unknown> = { pharmacyId: { $in: ids }, listed: true };
    if (body.category && PRODUCT_CATEGORIES.some((c) => c.id === body.category)) filter.category = body.category;
    const q = typeof body.q === 'string' ? body.q.trim().slice(0, 60) : '';
    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: re }, { genericName: re }, { strength: re }];
    }
    const products = await this.products.find(filter).limit(500).lean();

    const byId = new Map(nearby.map((p) => [String(p._id), p]));
    const order = new Map(nearby.map((p, i) => [String(p._id), i]));
    const items = products
      .map((p) => {
        const words = [...keyWords(p.name), ...keyWords(p.genericName)];
        return {
          ...productView(p as unknown as IProduct),
          inStock: p.stock > 0,
          // a doctor here prescribed something with this name: they can order it (step 3 checks it properly)
          prescribedForYou: words.some((w) => prescribed.has(w)),
        };
      })
      .sort(
        (a, b) =>
          Number(b.prescribedForYou) - Number(a.prescribedForYou) ||
          Number(b.inStock) - Number(a.inStock) ||
          order.get(a.pharmacyId)! - order.get(b.pharmacyId)! ||
          a.priceCents - b.priceCents,
      )
      .slice(0, 200);

    // how many listed products each pharmacy has, for the pharmacy list
    const counts = await this.products.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { pharmacyId: { $in: nearby.map((p) => p._id) }, listed: true, stock: { $gt: 0 } } },
      { $group: { _id: '$pharmacyId', n: { $sum: 1 } } },
    ]);

    return {
      ...base,
      pharmacies: nearby.map((p) => ({
        _id: String(p._id),
        name: p.name,
        address: p.address,
        phone: p.phone,
        operatedByClinic: p.operatedByClinic,
        distanceKm: Math.round(p.distanceMeters / 100) / 10,
        deliveryFeeCents: p.deliveryFeeCents,
        productsInStock: counts.find((c) => String(c._id) === String(p._id))?.n ?? 0,
      })),
      products: items.map((p) => {
        const ph = byId.get(p.pharmacyId)!;
        return { ...p, pharmacy: { _id: p.pharmacyId, name: ph.name, distanceKm: Math.round(ph.distanceMeters / 100) / 10, deliveryFeeCents: ph.deliveryFeeCents } };
      }),
    };
  }

  /** Words from medicines our doctors prescribed this patient (latest visits first). */
  private async prescribedWords(userId: string) {
    const visits = await this.appointments
      .find({ userId, 'healthData.prescribedMedicines.0': { $exists: true } })
      .select('healthData.prescribedMedicines.name')
      .sort({ date: -1 })
      .limit(50)
      .lean();
    return new Set(visits.flatMap((v) => (v.healthData?.prescribedMedicines ?? []).flatMap((m) => keyWords(m.name))));
  }
}
