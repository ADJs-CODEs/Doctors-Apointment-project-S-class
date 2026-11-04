"use client";

import {
  RiArrowLeftLine,
  RiCapsuleLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiFileList3Line,
  RiMapPin2Line,
  RiShieldCheckLine,
  RiShoppingBag3Line,
  RiStore2Line,
  RiTimeLine,
} from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useParams, useSearchParams } from "@/lib/navigation";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

type Status = "awaiting_payment" | "placed" | "accepted" | "packing" | "out_for_delivery" | "delivered" | "rejected" | "cancelled" | "expired";

export type ShopOrder = {
  _id: string;
  pharmacyName: string;
  items: {
    productId: string;
    name: string;
    strength?: string;
    image?: string;
    priceCents: number;
    quantity: number;
    requiresPrescription: boolean;
    prescription?: { medicineName: string; doctorName: string; slotDate: string };
  }[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  delivery: { address: string; phone: string; note?: string };
  status: Status;
  payBy?: string;
  paymentMethod: "wallet" | "stripe";
  paid: boolean;
  refund?: { status: "refunded" | "failed"; method: "wallet" | "stripe"; cents: number };
  rxCheck?: { name: string; license: string; at: string };
  needsPharmacist: boolean;
  rejectReason?: string;
  history: { status: Status; at: string; by: string; name?: string }[];
  createdAt: string;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

const STEPS: { status: Status; label: string }[] = [
  { status: "placed", label: "Placed" },
  { status: "accepted", label: "Accepted" },
  { status: "packing", label: "Packing" },
  { status: "out_for_delivery", label: "On the way" },
  { status: "delivered", label: "Delivered" },
];

const BADGE: Record<Status, { label: string; tone: string }> = {
  awaiting_payment: { label: "Waiting for payment", tone: "bg-amber-50 text-amber-700" },
  placed: { label: "Waiting for the pharmacy", tone: "bg-sky-50 text-sky-700" },
  accepted: { label: "Accepted", tone: "bg-teal-50 text-teal-700" },
  packing: { label: "Being packed", tone: "bg-teal-50 text-teal-700" },
  out_for_delivery: { label: "On the way", tone: "bg-violet-50 text-violet-700" },
  delivered: { label: "Delivered", tone: "bg-slate-100 text-slate-600" },
  rejected: { label: "Not accepted", tone: "bg-orange-50 text-orange-700" },
  cancelled: { label: "Cancelled", tone: "bg-slate-100 text-slate-500" },
  expired: { label: "Not paid in time", tone: "bg-slate-100 text-slate-500" },
};

const OPEN: Status[] = ["placed", "accepted", "packing", "out_for_delivery"];

/** /shop/orders: everything the patient has ordered. */
export function ShopOrderList() {
  const [orders, setOrders] = useState<ShopOrder[] | null>(null);
  useEffect(() => {
    axiosInstance
      .get(API_PATHS.SHOP.ORDERS)
      .then(({ data }) => (data.success ? setOrders(data.orders) : toast.error(data.message)))
      .catch((err) => toast.error(err.response?.data?.message || "Couldn't load your orders"));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-900">
        <RiArrowLeftLine size={16} /> Pharmacy shop
      </Link>
      <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink mt-2 mb-6">My orders</h1>
      {orders === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-3xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <RiShoppingBag3Line size={34} className="mx-auto text-slate-300" />
          <p className="font-black text-slate-900 mt-2">No orders yet</p>
          <Link to="/shop" className="inline-block mt-4 px-5 py-3 rounded-2xl bg-teal-600 text-white font-bold">
            Browse the shop
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o._id}>
              <Link to={`/shop/orders/${o._id}`} className="block bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 hover:border-teal-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">{o.pharmacyName}</p>
                    <p className="text-[12px] text-slate-500 truncate">
                      {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">{when(o.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-900 tabular-nums">{money(o.totalCents)}</p>
                    <span className={`inline-block mt-1 text-[12px] font-bold px-2 py-0.5 rounded-full ${BADGE[o.status].tone}`}>
                      {BADGE[o.status].label}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** /shop/orders/:id: where an order is, and what the patient can do about it. */
export function ShopOrderDetails() {
  const { id = "" } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const verified = useRef(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.SHOP.ORDER(id), { silent: true } as any);
      if (data.success) setOrder(data.order);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load this order");
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const sessionId = params.get("session_id");
    // back from Stripe: confirm the payment first (the webhook may beat us to it, that's fine)
    if (sessionId && !verified.current) {
      verified.current = true;
      axiosInstance
        .post(API_PATHS.SHOP.ORDER_VERIFY(id), { session_id: sessionId })
        .then(({ data }) => {
          if (data.success) {
            setOrder(data.order);
            toast.success("Paid. Your order is with the pharmacy.");
          } else toast.error(data.message);
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || "We couldn't confirm the payment yet");
          load();
        });
      return;
    }
    if (params.get("placed")) toast.success("Order placed");
    load();
  }, [id, params, load]);

  // keep it fresh while it's moving
  useEffect(() => {
    if (!order || !OPEN.includes(order.status)) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [order, load]);

  const act = async (request: Promise<{ data: any }>, onOk?: (data: any) => void) => {
    setBusy(true);
    try {
      const { data } = await request;
      if (!data.success) return toast.error(data.message);
      onOk?.(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="h-64 rounded-3xl bg-slate-200/60 animate-pulse" />
      </div>
    );
  }

  const reached = (s: Status) => order.history.find((h) => h.status === s);
  const closed = ["rejected", "cancelled", "expired"].includes(order.status);
  const canCancel = order.status === "placed" || order.status === "awaiting_payment";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-5">
      <Link to="/shop/orders" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-900">
        <RiArrowLeftLine size={16} /> My orders
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] md:text-[34px] leading-tight font-extrabold tracking-[-0.03em] text-ink flex items-center gap-2">
            <RiStore2Line className="text-brand-ink" /> {order.pharmacyName}
          </h1>
          <p className="text-[14px] text-ink-3">Ordered {when(order.createdAt)}</p>
        </div>
        <span className={`text-[13px] font-bold px-3 py-1 rounded-full ${BADGE[order.status].tone}`}>{BADGE[order.status].label}</span>
      </div>

      {order.status === "awaiting_payment" && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <RiTimeLine size={24} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-black text-amber-900">{params.get("paid") === "0" ? "The payment wasn't finished" : "Waiting for your payment"}</p>
            <p className="text-sm text-amber-800">
              Your items are set aside{order.payBy ? ` until ${new Date(order.payBy).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}` : ""}. Pay to
              send the order to the pharmacy.
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() => act(axiosInstance.post(API_PATHS.SHOP.ORDER_PAY(order._id)), (d) => (window.location.href = d.session_url))}
            className="px-5 py-3 rounded-2xl bg-amber-500 text-white font-black hover:bg-amber-600 disabled:opacity-50"
          >
            Pay {money(order.totalCents)}
          </button>
        </section>
      )}

      {closed ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 flex gap-3">
          <RiCloseCircleLine size={24} className="text-slate-400 shrink-0" />
          <div>
            <p className="font-black text-slate-900">
              {order.status === "rejected" ? `${order.pharmacyName} couldn't take this order` : order.status === "expired" ? "This order wasn't paid in time" : "This order was cancelled"}
            </p>
            {order.rejectReason && <p className="text-sm text-slate-600 mt-0.5">Reason: {order.rejectReason}</p>}
            {order.refund && (
              <p className={`text-sm mt-1 font-bold ${order.refund.status === "refunded" ? "text-teal-700" : "text-orange-700"}`}>
                {order.refund.status === "refunded"
                  ? order.refund.method === "wallet"
                    ? `${money(order.refund.cents)} is back in your wallet.`
                    : `${money(order.refund.cents)} refunded to your card (it can take 5–10 days to show).`
                  : "Your refund is being sent by the clinic."}
              </p>
            )}
            <Link to="/shop" className="inline-block mt-2 text-sm font-bold text-teal-700 underline">
              Back to the shop
            </Link>
          </div>
        </section>
      ) : (
        order.status !== "awaiting_payment" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <ol className="grid grid-cols-5 gap-1">
              {STEPS.map((s, i) => {
                const done = reached(s.status);
                const isNow = order.status === s.status;
                return (
                  <li key={s.status} className="flex flex-col items-center text-center">
                    <div className="flex items-center w-full">
                      <span className={`flex-1 h-1 rounded-full ${i === 0 ? "invisible" : done ? "bg-teal-500" : "bg-slate-200"}`} />
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          done ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-300"
                        } ${isNow && order.status !== "delivered" ? "ring-4 ring-teal-100" : ""}`}
                      >
                        <RiCheckLine size={16} />
                      </span>
                      <span className={`flex-1 h-1 rounded-full ${i === STEPS.length - 1 ? "invisible" : reached(STEPS[i + 1].status) ? "bg-teal-500" : "bg-slate-200"}`} />
                    </div>
                    <p className={`text-[11px] sm:text-xs font-bold mt-2 ${done ? "text-slate-900" : "text-slate-400"}`}>{s.label}</p>
                    {done && <p className="text-[10px] text-slate-400 hidden sm:block">{when(done.at)}</p>}
                  </li>
                );
              })}
            </ol>
            {order.status === "placed" && (
              <p className="text-sm text-slate-500 mt-4 text-center">
                {order.needsPharmacist ? "A pharmacist is checking your prescription." : `Waiting for ${order.pharmacyName} to accept it.`} You can still cancel.
              </p>
            )}
          </section>
        )
      )}

      <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
        <ul className="divide-y divide-slate-100">
          {order.items.map((i) => (
            <li key={i.productId} className="py-3 flex gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                {i.image ? <img src={i.image} alt="" className="w-full h-full object-cover" /> : <RiCapsuleLine size={20} className="text-slate-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">
                  {i.quantity} × {i.name}
                </p>
                {i.strength && <p className="text-[12px] text-slate-500">{i.strength}</p>}
                {i.prescription && (
                  <p className="text-[11px] text-violet-700 flex items-center gap-1 mt-0.5">
                    <RiFileList3Line size={12} /> Prescribed by {i.prescription.doctorName}
                  </p>
                )}
              </div>
              <p className="font-black text-slate-900 tabular-nums">{money(i.priceCents * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="text-sm space-y-1 border-t border-slate-100 pt-3 mt-1">
          <div className="flex justify-between text-slate-500">
            <dt>Delivery</dt>
            <dd>{order.deliveryFeeCents ? money(order.deliveryFeeCents) : "Free"}</dd>
          </div>
          <div className="flex justify-between font-black text-slate-900 text-base">
            <dt>Total {order.paid ? `(paid ${order.paymentMethod === "wallet" ? "from wallet" : "by card"})` : ""}</dt>
            <dd className="tabular-nums">{money(order.totalCents)}</dd>
          </div>
        </dl>
        {order.rxCheck && (
          <p className="mt-3 text-[12px] text-teal-800 bg-teal-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
            <RiShieldCheckLine size={15} /> Prescription checked by pharmacist {order.rxCheck.name} (licence {order.rxCheck.license})
          </p>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 text-sm">
        <p className="font-black text-slate-900 flex items-center gap-1.5 mb-1">
          <RiMapPin2Line size={16} className="text-teal-600" /> Delivering to
        </p>
        <p className="text-slate-700">{order.delivery.address}</p>
        <p className="text-slate-500">
          {order.delivery.phone}
          {order.delivery.note ? ` · “${order.delivery.note}”` : ""}
        </p>
      </section>

      {canCancel && (
        <button
          disabled={busy}
          onClick={() =>
            act(axiosInstance.post(API_PATHS.SHOP.ORDER_CANCEL(order._id)), (d) => {
              toast.success(d.message);
              setOrder(d.order);
            })
          }
          className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
        >
          Cancel order{order.paid ? " (full refund)" : ""}
        </button>
      )}
    </div>
  );
}
