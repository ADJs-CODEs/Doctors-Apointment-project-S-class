import { Schema, type Document, type Types } from 'mongoose';

/**
 * A patient's order from one pharmacy (step 3 of the medicine shop).
 *
 *   awaiting_payment -> placed -> accepted -> packing -> out_for_delivery -> delivered
 *                         |  \-> rejected (pharmacy; refunded)
 *                         \-> cancelled (patient, before it's accepted; refunded)
 *   awaiting_payment -> expired (card checkout never paid; stock returned)
 *
 * Stock is taken when the order is created and given back if it never goes ahead.
 * Items are copies (name, price) so the order reads the same if the product changes later.
 */
export type OrderStatus =
  | 'awaiting_payment'
  | 'placed'
  | 'accepted'
  | 'packing'
  | 'out_for_delivery'
  | 'delivered'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export const OPEN_ORDER: OrderStatus[] = ['placed', 'accepted', 'packing', 'out_for_delivery'];

export interface IOrderItem {
  productId: Types.ObjectId | string;
  name: string;
  strength?: string;
  packSize?: string;
  image?: string;
  priceCents: number;
  quantity: number;
  requiresPrescription: boolean;
  /** the prescription (one of our doctors') a prescription-only item is ordered against */
  prescription?: { appointmentId: string; medicineName: string; doctorName: string; slotDate: string };
}

export interface IShopOrder extends Document {
  userId: string;
  patientName: string;
  patientEmail: string;
  pharmacyId: Types.ObjectId | string;
  pharmacyName: string;
  items: IOrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  /** the clinic's cut of the items (not the delivery fee); 0 for the clinic's own pharmacy */
  commissionPercent: number;
  commissionCents: number;
  /** what the pharmacy is owed once it's delivered (items + delivery fee - commission) */
  pharmacyEarningCents: number;
  delivery: { address: string; phone: string; note?: string; point?: { type: 'Point'; coordinates: [number, number] } };
  status: OrderStatus;
  /** card checkout must be paid before this, or the order expires and the stock goes back */
  payBy?: Date;
  payment: {
    method: 'wallet' | 'stripe';
    paid: boolean;
    paidAt?: Date;
    stripeSessionId?: string;
    paymentIntentId?: string;
    walletPayment?: { fundCents: number; coins: number };
  };
  refund?: { status: 'refunded' | 'failed'; method: 'wallet' | 'stripe'; cents: number; stripeRefundId?: string; error?: string; at: Date };
  /** the pharmacist who checked the prescriptions (only for orders with prescription-only items) */
  rxCheck?: { staffId: string; name: string; license: string; at: Date };
  rejectReason?: string;
  /** earnings become withdrawable a day after this */
  deliveredAt?: Date;
  history: { status: OrderStatus; at: Date; by: 'patient' | 'pharmacy' | 'system'; name?: string }[];
  createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'product', required: true },
    name: { type: String, required: true },
    strength: String,
    packSize: String,
    image: String,
    priceCents: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    requiresPrescription: { type: Boolean, default: false },
    prescription: {
      type: new Schema({ appointmentId: String, medicineName: String, doctorName: String, slotDate: String }, { _id: false }),
      default: undefined,
    },
  },
  { _id: false },
);

export const ShopOrderSchema = new Schema<IShopOrder>(
  {
    userId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    patientEmail: { type: String, required: true },
    pharmacyId: { type: Schema.Types.ObjectId, ref: 'pharmacy', required: true, index: true },
    pharmacyName: { type: String, required: true },
    items: { type: [OrderItemSchema], required: true },
    subtotalCents: { type: Number, required: true },
    deliveryFeeCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
    commissionPercent: { type: Number, required: true },
    commissionCents: { type: Number, required: true },
    pharmacyEarningCents: { type: Number, required: true },
    delivery: {
      address: { type: String, required: true, maxlength: 300 },
      phone: { type: String, required: true, maxlength: 30 },
      note: { type: String, maxlength: 300 },
      point: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number], default: undefined },
      },
    },
    status: {
      type: String,
      enum: ['awaiting_payment', 'placed', 'accepted', 'packing', 'out_for_delivery', 'delivered', 'rejected', 'cancelled', 'expired'],
      default: 'awaiting_payment',
      index: true,
    },
    payBy: { type: Date },
    payment: {
      method: { type: String, enum: ['wallet', 'stripe'], required: true },
      paid: { type: Boolean, default: false },
      paidAt: Date,
      stripeSessionId: String,
      paymentIntentId: String,
      walletPayment: { type: new Schema({ fundCents: Number, coins: Number }, { _id: false }), default: undefined },
    },
    refund: {
      type: new Schema(
        {
          status: { type: String, enum: ['refunded', 'failed'] },
          method: { type: String, enum: ['wallet', 'stripe'] },
          cents: Number,
          stripeRefundId: String,
          error: String,
          at: Date,
        },
        { _id: false },
      ),
      default: undefined,
    },
    rxCheck: { type: new Schema({ staffId: String, name: String, license: String, at: Date }, { _id: false }), default: undefined },
    rejectReason: { type: String, maxlength: 500 },
    deliveredAt: { type: Date },
    history: [
      new Schema(
        { status: String, at: Date, by: { type: String, enum: ['patient', 'pharmacy', 'system'] }, name: String },
        { _id: false },
      ),
    ],
  },
  { timestamps: true },
);
ShopOrderSchema.index({ pharmacyId: 1, status: 1, createdAt: -1 });
ShopOrderSchema.index({ status: 1, payBy: 1 });
ShopOrderSchema.index({ pharmacyId: 1, deliveredAt: 1 });
