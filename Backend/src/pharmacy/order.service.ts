import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { type Connection, isValidObjectId, type Model, type Types } from 'mongoose';
import Stripe from 'stripe';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IAppointment } from '../database/schemas/appointment.schema';
import type { IPharmacy, IProduct } from '../database/schemas/pharmacy.schemas';
import { type IOrderItem, type IShopOrder, OPEN_ORDER, type OrderStatus } from '../database/schemas/shop-order.schema';
import type { IUser } from '../database/schemas/user.schema';
import type { IWallet, IWalletTransaction } from '../database/schemas/wallet.schemas';
import { MapsService } from '../maps/maps.service';
import { EmailNotifications } from '../notifications/email-notifications';
import type { StaffContext } from './pharmacy.auth';
import { keyWords, ShopService } from './shop.service';

const PAY_MINUTES = 30; // Stripe's shortest checkout lifetime
const MAX_QUANTITY = 20;
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const commissionPercent = () => {
  const n = Number(process.env.PHARMACY_COMMISSION_PERCENT ?? 10);
  return Number.isFinite(n) && n >= 0 && n <= 50 ? n : 10;
};

type NewOrder = {
  pharmacyId?: string;
  items?: { productId?: string; quantity?: number; prescriptionAppointmentId?: string }[];
  delivery?: { address?: string; phone?: string; note?: string };
  origin?: unknown;
  payWith?: 'wallet' | 'card';
};

// the pharmacy moves an order forward one step at a time
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { accepted: 'packing', packing: 'out_for_delivery', out_for_delivery: 'delivered' };

/** What a patient or pharmacy sees of an order (no wallet internals or Stripe ids). */
export const orderView = (o: IShopOrder) => ({
  _id: String(o._id),
  pharmacyId: String(o.pharmacyId),
  pharmacyName: o.pharmacyName,
  patientName: o.patientName,
  items: o.items,
  subtotalCents: o.subtotalCents,
  deliveryFeeCents: o.deliveryFeeCents,
  totalCents: o.totalCents,
  delivery: { address: o.delivery.address, phone: o.delivery.phone, note: o.delivery.note },
  status: o.status,
  payBy: o.payBy,
  paymentMethod: o.payment.method,
  paid: o.payment.paid,
  refund: o.refund && { status: o.refund.status, method: o.refund.method, cents: o.refund.cents },
  rxCheck: o.rxCheck && { name: o.rxCheck.name, license: o.rxCheck.license, at: o.rxCheck.at },
  needsPharmacist: o.items.some((i) => i.requiresPrescription),
  rejectReason: o.rejectReason,
  history: o.history,
  createdAt: o.createdAt,
});

/**
 * Pharmacy orders, end to end: placing (stock set aside, delivery area checked, paid by
 * wallet or card), the pharmacy accepting (a pharmacist for prescription items), packing,
 * delivering, and refunds when an order doesn't go ahead. Every status change is a single
 * conditional update, so two people clicking at once can't both win.
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger('ShopOrders');
  private stripeClient?: Stripe;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MODEL.shopOrder) private readonly orders: Model<IShopOrder>,
    @InjectModel(MODEL.product) private readonly products: Model<IProduct>,
    @InjectModel(MODEL.pharmacy) private readonly pharmacies: Model<IPharmacy>,
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.wallet) private readonly wallets: Model<IWallet>,
    @InjectModel(MODEL.walletTransaction) private readonly ledger: Model<IWalletTransaction>,
    private readonly shop: ShopService,
    private readonly maps: MapsService,
    private readonly emails: EmailNotifications,
  ) {}

  private get stripe() {
    this.stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY as string);
    return this.stripeClient;
  }

  // --- the patient ---

  /** Medicines our doctors prescribed this patient, to order prescription-only items against. */
  async prescriptions(userId: string) {
    const visits = await this.appointments
      .find({ userId, cancelled: { $ne: true }, 'healthData.prescribedMedicines.0': { $exists: true } })
      .select(['slotDate', 'docData.name', 'healthData.prescribedMedicines.name', 'date'])
      .sort({ date: -1 })
      .limit(50)
      .lean();
    const prescriptions = visits.flatMap((v) =>
      (v.healthData?.prescribedMedicines ?? []).map((m) => ({
        appointmentId: String(v._id),
        medicineName: m.name,
        doctorName: v.docData?.name ?? 'Your doctor',
        slotDate: v.slotDate,
      })),
    );
    return { success: true, prescriptions };
  }

  async create(userId: string, body: NewOrder) {
    await this.expireUnpaid();
    const payWith = body.payWith === 'card' ? 'stripe' : body.payWith === 'wallet' ? 'wallet' : fail('Choose how to pay');
    const address = clean(body.delivery?.address, 300);
    const phone = clean(body.delivery?.phone, 30);
    if (!address || !phone) fail('Enter the delivery address and a phone number for the rider');

    // the pharmacy must be approved and deliver to where the patient is
    if (!body.pharmacyId || !isValidObjectId(body.pharmacyId)) fail('Pharmacy not found', HttpStatus.NOT_FOUND);
    const { point } = await this.maps.patientOrigin(userId, body.origin);
    const reach = (await this.shop.reachable(point, userId)).find((p) => String(p._id) === body.pharmacyId);
    if (!reach) fail("This pharmacy doesn't deliver to that address");
    const pharmacy = (await this.pharmacies.findById(body.pharmacyId))!;
    const user = await this.users.findById(userId).select(['name', 'email']);
    if (!user) fail('User not found', HttpStatus.NOT_FOUND);

    // the basket: one line per product, sensible quantities
    const wanted = new Map<string, { quantity: number; prescriptionAppointmentId?: string }>();
    for (const line of body.items ?? []) {
      const id = String(line.productId ?? '');
      const quantity = Number(line.quantity);
      if (!isValidObjectId(id) || !Number.isInteger(quantity) || quantity < 1) fail('Check the quantities in your basket');
      const prev = wanted.get(id);
      wanted.set(id, { quantity: (prev?.quantity ?? 0) + quantity, prescriptionAppointmentId: line.prescriptionAppointmentId ?? prev?.prescriptionAppointmentId });
    }
    if (!wanted.size) fail('Your basket is empty');
    if (wanted.size > 30) fail('That is a lot of different items; split it into two orders');

    const products = await this.products.find({ _id: { $in: [...wanted.keys()] }, pharmacyId: pharmacy._id, listed: true });
    if (products.length !== wanted.size) fail('Something in your basket is no longer sold by this pharmacy');

    const items: IOrderItem[] = [];
    for (const p of products) {
      const line = wanted.get(String(p._id))!;
      if (line.quantity > MAX_QUANTITY) fail(`You can order up to ${MAX_QUANTITY} of ${p.name}`);
      items.push({
        productId: p._id as IOrderItem['productId'],
        name: p.name,
        strength: p.strength,
        packSize: p.packSize,
        image: p.image,
        priceCents: p.priceCents,
        quantity: line.quantity,
        requiresPrescription: p.requiresPrescription,
        prescription: p.requiresPrescription ? await this.checkPrescription(userId, p, line.prescriptionAppointmentId) : undefined,
      });
    }

    // set the stock aside now, so two people can't buy the last pack
    const reserved: IOrderItem[] = [];
    for (const item of items) {
      const taken = await this.products.updateOne(
        { _id: item.productId, stock: { $gte: item.quantity }, listed: true },
        { $inc: { stock: -item.quantity } },
      );
      if (!taken.modifiedCount) {
        await this.returnStock(reserved);
        const left = (await this.products.findById(item.productId).select('stock').lean())?.stock ?? 0;
        fail(left ? `Only ${left} ${item.name} left` : `${item.name} just sold out`, HttpStatus.CONFLICT);
      }
      reserved.push(item);
    }

    const subtotalCents = items.reduce((n, i) => n + i.priceCents * i.quantity, 0);
    const percent = pharmacy.operatedByClinic ? 0 : commissionPercent();
    const commissionCents = Math.round((subtotalCents * percent) / 100);
    const totalCents = subtotalCents + pharmacy.deliveryFeeCents;
    const order = await this.orders.create({
      userId,
      patientName: user.name,
      patientEmail: user.email,
      pharmacyId: pharmacy._id,
      pharmacyName: pharmacy.name,
      items,
      subtotalCents,
      deliveryFeeCents: pharmacy.deliveryFeeCents,
      totalCents,
      commissionPercent: percent,
      commissionCents,
      pharmacyEarningCents: totalCents - commissionCents,
      delivery: { address, phone, note: clean(body.delivery?.note, 300) || undefined, point: { type: 'Point', coordinates: [point.lng, point.lat] } },
      status: 'awaiting_payment',
      payBy: new Date(Date.now() + PAY_MINUTES * 60_000),
      payment: { method: payWith, paid: false },
      history: [],
    });

    if (payWith === 'wallet') {
      try {
        await this.payFromWallet(order);
      } catch (err) {
        // never placed: give the stock back and forget the order
        await this.returnStock(items);
        await this.orders.deleteOne({ _id: order._id, status: 'awaiting_payment' });
        throw err;
      }
      return { success: true, message: 'Order placed', orderId: String(order._id) };
    }
    return { success: true, orderId: String(order._id), session_url: await this.checkoutUrl(order) };
  }

  /** A card order that wasn't paid yet: open Stripe Checkout again (until it expires). */
  async payAgain(userId: string, orderId: string) {
    const order = await this.mine(userId, orderId);
    if (order.status !== 'awaiting_payment' || order.payment.method !== 'stripe') fail('This order is not waiting for payment');
    if (order.payBy && order.payBy.getTime() < Date.now() + 60_000) fail('This order expired. Please order again.');
    return { success: true, session_url: await this.checkoutUrl(order) };
  }

  /** Back from Stripe: confirm with Stripe that it was paid (the webhook may already have). */
  async verify(userId: string, orderId: string, sessionId?: string) {
    const order = await this.mine(userId, orderId);
    if (order.payment.paid) return { success: true, order: orderView(order) };
    if (!sessionId) fail('Missing payment reference');
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.orderId !== String(order._id)) fail('That payment is for something else');
    if (session.payment_status !== 'paid') fail('The payment was not completed');
    await this.markStripePaid(session);
    return { success: true, order: orderView((await this.orders.findById(order._id))!) };
  }

  /** Stripe says the checkout was paid (webhook or verify). Runs its effects once. */
  async markStripePaid(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId || !isValidObjectId(orderId)) return;
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    const paid = { 'payment.paid': true, 'payment.paidAt': new Date(), 'payment.paymentIntentId': paymentIntentId, 'payment.stripeSessionId': session.id };

    let order = await this.orders.findOneAndUpdate(
      { _id: orderId, status: 'awaiting_payment' },
      { $set: { ...paid, status: 'placed' }, $unset: { payBy: 1 }, $push: { history: { status: 'placed', at: new Date(), by: 'patient' } } },
      { returnDocument: 'after' },
    );
    if (!order) {
      // paid after it expired: take the stock again if it's still there, else refund
      const expired = await this.orders.findOne({ _id: orderId, status: 'expired', 'payment.paid': false });
      if (!expired) return;
      const back = await this.takeStockAgain(expired.items);
      order = await this.orders.findOneAndUpdate(
        { _id: orderId, status: 'expired', 'payment.paid': false },
        back
          ? { $set: { ...paid, status: 'placed' }, $push: { history: { status: 'placed', at: new Date(), by: 'patient' } } }
          : { $set: { ...paid, status: 'cancelled', rejectReason: 'Sold out while the payment was going through' }, $push: { history: { status: 'cancelled', at: new Date(), by: 'system' } } },
        { returnDocument: 'after' },
      );
      if (!order) {
        if (back) await this.returnStock(expired.items);
        return;
      }
      if (!back) {
        await this.refund(order);
        this.emails.orderUpdate((await this.orders.findById(order._id))!);
        return;
      }
    }
    await this.announcePlaced(order);
  }

  async myOrders(userId: string) {
    await this.expireUnpaid();
    const orders = await this.orders.find({ userId, status: { $ne: 'expired' } }).sort({ createdAt: -1 }).limit(100);
    return { success: true, orders: orders.map(orderView) };
  }

  async myOrder(userId: string, orderId: string) {
    await this.expireUnpaid();
    return { success: true, order: orderView(await this.mine(userId, orderId)) };
  }

  /** The patient changes their mind before the pharmacy has accepted it: full refund. */
  async cancel(userId: string, orderId: string) {
    const order = await this.mine(userId, orderId);
    const closed = await this.close(order._id, ['placed', 'awaiting_payment'], 'cancelled', { by: 'patient' });
    if (!closed) {
      const now = (await this.orders.findById(order._id).select('status').lean())?.status;
      fail(
        now === 'cancelled' || now === 'expired'
          ? 'This order is already cancelled'
          : now === 'rejected'
            ? 'The pharmacy already turned this order down; you were refunded'
            : 'The pharmacy has already accepted this order, so it can no longer be cancelled. Contact them.',
      );
    }
    if (closed.payment.paid) await this.refund(closed);
    const final = (await this.orders.findById(order._id))!;
    if (final.payment.paid) this.emails.orderUpdate(final);
    return { success: true, message: final.payment.paid ? 'Cancelled. Your money is on its way back.' : 'Cancelled', order: orderView(final) };
  }

  // --- the pharmacy ---

  async pharmacyOrders({ pharmacy }: StaffContext, view?: string) {
    await this.expireUnpaid();
    const status: OrderStatus[] =
      view === 'new' ? ['placed'] : view === 'active' ? ['accepted', 'packing', 'out_for_delivery'] : ['delivered', 'rejected', 'cancelled'];
    const orders = await this.orders
      .find({ pharmacyId: pharmacy._id, status: { $in: status } })
      .sort({ createdAt: view === 'done' ? -1 : 1 })
      .limit(200);
    const counts = await this.orders.aggregate<{ _id: string; n: number }>([
      { $match: { pharmacyId: pharmacy._id, status: { $in: OPEN_ORDER } } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    const n = (s: string) => counts.find((c) => c._id === s)?.n ?? 0;
    return {
      success: true,
      orders: orders.map(orderView),
      counts: { new: n('placed'), active: n('accepted') + n('packing') + n('out_for_delivery') },
    };
  }

  /** Accept a paid order. Prescription items need a pharmacist, whose name and licence are recorded. */
  async accept({ staff, pharmacy }: StaffContext, orderId: string) {
    const order = await this.ours(pharmacy._id, orderId);
    const needsPharmacist = order.items.some((i) => i.requiresPrescription);
    const isPharmacist = !!staff.pharmacistLicense && (staff.role === 'pharmacist' || staff.role === 'owner');
    if (needsPharmacist && !isPharmacist) {
      fail('This order has prescription-only medicines. A pharmacist must check the prescription and accept it.', HttpStatus.FORBIDDEN);
    }
    const updated = await this.orders.findOneAndUpdate(
      { _id: order._id, status: 'placed' },
      {
        $set: {
          status: 'accepted',
          ...(needsPharmacist && { rxCheck: { staffId: String(staff._id), name: staff.name, license: staff.pharmacistLicense!, at: new Date() } }),
        },
        $push: { history: { status: 'accepted', at: new Date(), by: 'pharmacy', name: staff.name } },
      },
      { returnDocument: 'after' },
    );
    if (!updated) fail('Someone already handled this order');
    this.emails.orderUpdate(updated);
    return { success: true, message: 'Accepted', order: orderView(updated) };
  }

  /** Refuse a paid order (out of stock, prescription doesn't fit...): the patient is refunded. */
  async reject({ staff, pharmacy }: StaffContext, orderId: string, reason?: string) {
    const order = await this.ours(pharmacy._id, orderId);
    const why = clean(reason, 500);
    if (!why) fail('Tell the patient why');
    const closed = await this.close(order._id, ['placed'], 'rejected', { by: 'pharmacy', name: staff.name, reason: why });
    if (!closed) fail('Someone already handled this order');
    await this.refund(closed);
    const final = (await this.orders.findById(order._id))!;
    this.emails.orderUpdate(final);
    return { success: true, message: 'Rejected. The patient has been refunded.', order: orderView(final) };
  }

  /** accepted -> packing -> out for delivery -> delivered, one step at a time. */
  async advance({ staff, pharmacy }: StaffContext, orderId: string, to?: string) {
    const order = await this.ours(pharmacy._id, orderId);
    const from = (Object.keys(NEXT) as OrderStatus[]).find((s) => NEXT[s] === to);
    if (!from) fail('Unknown step');
    const updated = await this.orders.findOneAndUpdate(
      { _id: order._id, status: from },
      {
        $set: { status: to, ...(to === 'delivered' && { deliveredAt: new Date() }) },
        $push: { history: { status: to, at: new Date(), by: 'pharmacy', name: staff.name } },
      },
      { returnDocument: 'after' },
    );
    if (!updated) fail(order.status === to ? 'Already done' : 'Do the steps in order');
    this.emails.orderUpdate(updated);
    return { success: true, message: 'Updated', order: orderView(updated) };
  }

  // --- the admin ---

  /** Every order, newest first: status filter, or "attention" for refunds that failed. */
  async adminList(view?: string) {
    const filter: Record<string, unknown> =
      view === 'attention'
        ? { 'refund.status': 'failed' }
        : view === 'open'
          ? { status: { $in: OPEN_ORDER } }
          : view === 'delivered'
            ? { status: 'delivered' }
            : view === 'closed'
              ? { status: { $in: ['rejected', 'cancelled'] } }
              : { status: { $nin: ['awaiting_payment', 'expired'] } };
    const orders = await this.orders.find(filter).sort({ createdAt: -1 }).limit(300);
    return {
      success: true,
      orders: orders.map((o) => ({
        ...orderView(o),
        patientEmail: o.patientEmail,
        commissionCents: o.commissionCents,
        pharmacyEarningCents: o.pharmacyEarningCents,
        refundError: o.refund?.status === 'failed' ? o.refund.error : undefined,
      })),
    };
  }

  // --- money and stock ---

  /** Care fund first, then coins, in one transaction with the order (like appointments). */
  private async payFromWallet(order: IShopOrder) {
    const cost = order.totalCents;
    const wallet = await this.wallets.findOne({ userId: order.userId }).lean();
    const fundCents = Math.min(wallet?.fundCents ?? 0, cost);
    const coins = cost - fundCents;
    if ((wallet?.coins ?? 0) < coins) {
      fail(
        `Not enough in your wallet: this costs $${(cost / 100).toFixed(2)} and you have $${(((wallet?.fundCents ?? 0) + (wallet?.coins ?? 0)) / 100).toFixed(2)}`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    let placed: IShopOrder | null = null;
    const db = await this.connection.startSession();
    try {
      await db.withTransaction(async () => {
        const taken = await this.wallets.updateOne(
          { userId: order.userId, fundCents: { $gte: fundCents }, coins: { $gte: coins } },
          { $inc: { fundCents: -fundCents, coins: -coins } },
          { session: db },
        );
        if (!taken.modifiedCount) fail('Your wallet balance changed; please try again', HttpStatus.CONFLICT);
        placed = await this.orders.findOneAndUpdate(
          { _id: order._id, status: 'awaiting_payment' },
          {
            $set: { status: 'placed', 'payment.paid': true, 'payment.paidAt': new Date(), 'payment.walletPayment': { fundCents, coins } },
            $unset: { payBy: 1 },
            $push: { history: { status: 'placed', at: new Date(), by: 'patient' } },
          },
          { returnDocument: 'after', session: db },
        );
        if (!placed) fail('This order was already paid');
        await this.ledger.create(
          [{ userId: order.userId, kind: 'shop_payment', coins: -coins, cents: -fundCents, orderId: String(order._id), counterpartyName: order.pharmacyName }],
          { session: db },
        );
      });
    } finally {
      await db.endSession();
    }
    await this.announcePlaced(placed!);
  }

  /** Gives a paid order's money back the way it came. Once per order (claims `refund` first). */
  private async refund(order: IShopOrder) {
    if (!order.payment.paid || order.refund) return;
    if (order.payment.method === 'wallet') {
      const wp = order.payment.walletPayment ?? { fundCents: 0, coins: order.totalCents };
      const db = await this.connection.startSession();
      try {
        await db.withTransaction(async () => {
          const claimed = await this.orders.updateOne(
            { _id: order._id, refund: { $exists: false } },
            { $set: { refund: { status: 'refunded', method: 'wallet', cents: order.totalCents, at: new Date() } } },
            { session: db },
          );
          if (!claimed.modifiedCount) return;
          await this.wallets.updateOne({ userId: order.userId }, { $inc: { fundCents: wp.fundCents, coins: wp.coins } }, { upsert: true, session: db });
          await this.ledger.create(
            [{ userId: order.userId, kind: 'shop_refund', coins: wp.coins, cents: wp.fundCents, orderId: String(order._id), counterpartyName: order.pharmacyName }],
            { session: db },
          );
        });
      } finally {
        await db.endSession();
      }
      return;
    }

    // card: claim it first, then ask Stripe (same idempotency key = never refunded twice)
    const claimed = await this.orders.updateOne(
      { _id: order._id, refund: { $exists: false } },
      { $set: { refund: { status: 'failed', method: 'stripe', cents: order.totalCents, error: 'in progress', at: new Date() } } },
    );
    if (!claimed.modifiedCount) return;
    try {
      if (!order.payment.paymentIntentId) throw new Error('no payment reference saved');
      const r = await this.stripe.refunds.create(
        { payment_intent: order.payment.paymentIntentId, reason: 'requested_by_customer', metadata: { orderId: String(order._id) } },
        { idempotencyKey: `pharmacy-order-refund-${order._id}` },
      );
      await this.orders.updateOne({ _id: order._id }, { $set: { refund: { status: 'refunded', method: 'stripe', cents: order.totalCents, stripeRefundId: r.id, at: new Date() } } });
    } catch (err: any) {
      this.logger.error(`refund for order ${order._id} failed: ${err.message}`);
      await this.orders.updateOne({ _id: order._id }, { $set: { 'refund.error': String(err.message).slice(0, 300) } });
      this.emails.orderRefundNeedsAdmin(order, err.message);
    }
  }

  /** Moves an order to a closed status (once) and puts its stock back. */
  private async close(orderId: Types.ObjectId | string, from: OrderStatus[], to: 'cancelled' | 'rejected' | 'expired', who: { by: 'patient' | 'pharmacy' | 'system'; name?: string; reason?: string }) {
    const closed = await this.orders.findOneAndUpdate(
      { _id: orderId, status: { $in: from } },
      {
        $set: { status: to, ...(who.reason && { rejectReason: who.reason }) },
        $unset: { payBy: 1 },
        $push: { history: { status: to, at: new Date(), by: who.by, name: who.name } },
      },
      { returnDocument: 'after' },
    );
    if (closed) await this.returnStock(closed.items);
    return closed;
  }

  /** Card orders not paid in time: closed, stock back on the shelf. */
  async expireUnpaid() {
    const stale = await this.orders.find({ status: 'awaiting_payment', payBy: { $lt: new Date() } }).select('_id').limit(100).lean();
    for (const o of stale) await this.close(o._id, ['awaiting_payment'], 'expired', { by: 'system' });
  }

  private async returnStock(items: Pick<IOrderItem, 'productId' | 'quantity'>[]) {
    for (const i of items) await this.products.updateOne({ _id: i.productId }, { $inc: { stock: i.quantity } });
  }

  private async takeStockAgain(items: IOrderItem[]) {
    const taken: IOrderItem[] = [];
    for (const i of items) {
      const ok = await this.products.updateOne({ _id: i.productId, stock: { $gte: i.quantity } }, { $inc: { stock: -i.quantity } });
      if (!ok.modifiedCount) {
        await this.returnStock(taken);
        return false;
      }
      taken.push(i);
    }
    return true;
  }

  // --- helpers ---

  /** A prescription-only product must match a medicine one of our doctors prescribed this patient. */
  private async checkPrescription(userId: string, product: IProduct, appointmentId?: string) {
    const needed = `${product.name} needs a prescription from one of our doctors`;
    if (!appointmentId || !isValidObjectId(appointmentId)) fail(needed, HttpStatus.FORBIDDEN);
    const visit = await this.appointments.findOne({ _id: appointmentId, userId, cancelled: { $ne: true } }).lean();
    const words = new Set([...keyWords(product.name), ...keyWords(product.genericName)]);
    const med = visit?.healthData?.prescribedMedicines?.find((m) => keyWords(m.name).some((w) => words.has(w)));
    if (!visit || !med) fail(`${needed}, and the prescription you picked doesn't include it`, HttpStatus.FORBIDDEN);
    return { appointmentId: String(visit._id), medicineName: med.name, doctorName: visit.docData?.name ?? 'Your doctor', slotDate: visit.slotDate };
  }

  private async checkoutUrl(order: IShopOrder) {
    const back = `${process.env.USER_URL}/shop/orders/${order._id}`;
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${back}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${back}?paid=0`,
      metadata: { kind: 'pharmacy_order', orderId: String(order._id) },
      expires_at: Math.floor((order.payBy?.getTime() ?? Date.now() + PAY_MINUTES * 60_000) / 1000),
      line_items: [
        ...order.items.map((i) => ({
          price_data: {
            currency: process.env.CURRENCY || 'usd',
            product_data: { name: i.name, ...(i.strength && { description: i.strength }) },
            unit_amount: i.priceCents,
          },
          quantity: i.quantity,
        })),
        ...(order.deliveryFeeCents
          ? [{ price_data: { currency: process.env.CURRENCY || 'usd', product_data: { name: `Delivery by ${order.pharmacyName}` }, unit_amount: order.deliveryFeeCents }, quantity: 1 }]
          : []),
      ],
    });
    await this.orders.updateOne({ _id: order._id }, { $set: { 'payment.stripeSessionId': session.id } });
    return session.url;
  }

  private async announcePlaced(order: IShopOrder) {
    const pharmacy = await this.pharmacies.findById(order.pharmacyId).select('email').lean();
    this.emails.orderPlaced(order, pharmacy?.email);
  }

  private async mine(userId: string, orderId: string) {
    if (!isValidObjectId(orderId)) fail('Order not found', HttpStatus.NOT_FOUND);
    const order = await this.orders.findOne({ _id: orderId, userId });
    if (!order) fail('Order not found', HttpStatus.NOT_FOUND);
    return order;
  }

  private async ours(pharmacyId: Types.ObjectId | string, orderId: string) {
    if (!isValidObjectId(orderId)) fail('Order not found', HttpStatus.NOT_FOUND);
    const order = await this.orders.findOne({ _id: orderId, pharmacyId, status: { $ne: 'awaiting_payment' } });
    if (!order) fail('Order not found', HttpStatus.NOT_FOUND);
    return order;
  }
}
