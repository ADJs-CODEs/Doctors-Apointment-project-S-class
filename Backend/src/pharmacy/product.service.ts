import { HttpStatus, Injectable } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { diskStorage } from 'multer';
import { isValidObjectId, type Model } from 'mongoose';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import { type IProduct, PRODUCT_CATEGORIES, type ProductCategory } from '../database/schemas/pharmacy.schemas';
import { CloudinaryService } from '../integrations/integrations';
import type { StaffContext } from './pharmacy.auth';

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const CATEGORY_IDS = PRODUCT_CATEGORIES.map((c) => c.id) as readonly string[];

/** Product photos: images only, at most 3 MB (the general upload has no limits). */
export const ProductImageUpload = () =>
  FileInterceptor('image', {
    storage: diskStorage({}),
    limits: { fileSize: 3 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) =>
      /^image\/(jpeg|png|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Use a JPG, PNG or WebP photo'), false),
  });

type ProductBody = {
  name?: string;
  genericName?: string;
  strength?: string;
  packSize?: string;
  category?: string;
  description?: string;
  priceCents?: number | string;
  stock?: number | string;
  requiresPrescription?: boolean | string;
  listed?: boolean | string;
};

// multipart forms send everything as text
const bool = (v: unknown) => v === true || v === 'true';

export const productView = (p: IProduct) => ({
  _id: String(p._id),
  pharmacyId: String(p.pharmacyId),
  name: p.name,
  genericName: p.genericName,
  strength: p.strength,
  packSize: p.packSize,
  category: p.category,
  description: p.description,
  priceCents: p.priceCents,
  stock: p.stock,
  requiresPrescription: p.requiresPrescription,
  image: p.image,
  listed: p.listed,
});

/** A pharmacy's own catalogue: what it sells, at what price, and how many are in stock. */
@Injectable()
export class ProductService {
  constructor(
    @InjectModel(MODEL.product) private readonly products: Model<IProduct>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async list({ pharmacy }: StaffContext) {
    const products = await this.products.find({ pharmacyId: pharmacy._id }).sort({ listed: -1, name: 1 }).limit(2000);
    return { success: true, products: products.map(productView), categories: PRODUCT_CATEGORIES };
  }

  async create({ pharmacy }: StaffContext, body: ProductBody, imagePath?: string) {
    const fields = this.read(body, true);
    const image = imagePath ? await this.cloudinary.uploadImage(imagePath) : undefined;
    const product = await this.products.create({ ...(fields as Partial<IProduct>), pharmacyId: pharmacy._id as IProduct['pharmacyId'], image });
    return { success: true, message: `${product.name} added`, product: productView(product) };
  }

  async update({ pharmacy }: StaffContext, productId: string, body: ProductBody, imagePath?: string) {
    const product = await this.mine(pharmacy._id as IProduct['pharmacyId'], productId);
    const fields = this.read(body, false);
    if (imagePath) fields.image = await this.cloudinary.uploadImage(imagePath);
    const updated = await this.products.findByIdAndUpdate(product._id, { $set: fields }, { returnDocument: 'after' });
    return { success: true, message: 'Saved', product: productView(updated!) };
  }

  /** Quick stock change from the list: set it, or add/remove some (a delivery came in, one broke). */
  async setStock({ pharmacy }: StaffContext, productId: string, body: { stock?: number; change?: number }) {
    const product = await this.mine(pharmacy._id as IProduct['pharmacyId'], productId);
    let updated: IProduct | null;
    if (body.change !== undefined) {
      const change = Number(body.change);
      if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 100_000) fail('Enter a whole number');
      // atomic, and never below zero (orders will take stock at the same time in step 3)
      updated = await this.products.findOneAndUpdate(
        { _id: product._id, ...(change < 0 && { stock: { $gte: -change } }) },
        { $inc: { stock: change } },
        { returnDocument: 'after' },
      );
      if (!updated) fail(`Only ${product.stock} in stock`);
    } else {
      updated = await this.products.findByIdAndUpdate(product._id, { $set: { stock: this.count(body.stock) } }, { returnDocument: 'after' });
    }
    return { success: true, message: 'Stock updated', product: productView(updated!) };
  }

  private async mine(pharmacyId: IProduct['pharmacyId'], productId: string) {
    if (!isValidObjectId(productId)) fail('Product not found', HttpStatus.NOT_FOUND);
    const product = await this.products.findOne({ _id: productId, pharmacyId });
    if (!product) fail('Product not found', HttpStatus.NOT_FOUND);
    return product;
  }

  /** Reads the form. On create everything required must be there; on edit only what's sent. */
  private read(body: ProductBody, creating: boolean) {
    const out: Record<string, unknown> & { image?: string } = {};
    const has = (k: keyof ProductBody) => creating || body[k] !== undefined;

    if (has('name')) out.name = clean(body.name, 120) || fail('Enter the product name');
    for (const [k, max] of [['genericName', 120], ['strength', 60], ['packSize', 60], ['description', 1000]] as const) {
      if (body[k] !== undefined) out[k] = clean(body[k], max) || undefined;
    }
    if (has('category')) {
      const category = (body.category || 'other') as ProductCategory;
      if (!CATEGORY_IDS.includes(category)) fail('Pick a section of the shop');
      out.category = category;
    }
    if (has('priceCents')) {
      const price = Number(body.priceCents);
      if (!Number.isInteger(price) || price < 1 || price > 10_000_000) fail('Enter a price');
      out.priceCents = price;
    }
    if (has('stock')) out.stock = this.count(body.stock ?? 0);
    if (body.requiresPrescription !== undefined) out.requiresPrescription = bool(body.requiresPrescription);
    if (body.listed !== undefined) out.listed = bool(body.listed);
    return out;
  }

  private count(value: unknown) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) fail('Stock must be a whole number, 0 or more');
    return n;
  }
}
