"use client";

import { RiErrorWarningLine, RiFileList3Line, RiShoppingBag3Line, RiStore2Line } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Pill, Skeleton } from "../../components/panel";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Status = "placed" | "accepted" | "packing" | "out_for_delivery" | "delivered" | "rejected" | "cancelled";

type Order = {
  _id: string;
  pharmacyName: string;
  patientName: string;
  patientEmail: string;
  items: { productId: string; name: string; quantity: number; priceCents: number; requiresPrescription: boolean; prescription?: { doctorName: string } }[];
  totalCents: number;
  commissionCents: number;
  pharmacyEarningCents: number;
  status: Status;
  paymentMethod: "wallet" | "stripe";
  refund?: { status: "refunded" | "failed"; method: "wallet" | "stripe"; cents: number };
  refundError?: string;
  rxCheck?: { name: string; license: string };
  rejectReason?: string;
  createdAt: string;
};

const VIEWS = [
  { id: "open", label: "In progress" },
  { id: "delivered", label: "Delivered" },
  { id: "closed", label: "Rejected / cancelled" },
  { id: "attention", label: "Refund problems" },
  { id: "all", label: "All" },
] as const;

const STATUS: Record<Status, { label: string; tone: "amber" | "brand" | "violet" | "neutral" | "rose" }> = {
  placed: { label: "Waiting for pharmacy", tone: "amber" },
  accepted: { label: "Accepted", tone: "brand" },
  packing: { label: "Packing", tone: "brand" },
  out_for_delivery: { label: "On the way", tone: "violet" },
  delivered: { label: "Delivered", tone: "neutral" },
  rejected: { label: "Rejected", tone: "rose" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Every pharmacy order, for the clinic to keep an eye on (read-only; pharmacies run them). */
export default function ShopOrders() {
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("open");
  const [orders, setOrders] = useState<Order[] | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.SHOP_ORDERS, { params: { view } });
      if (data.success) setOrders(data.orders);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load orders");
    }
  }, [view]);

  useEffect(() => {
    setOrders(null);
    load();
  }, [load]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <PageHeader eyebrow="Medicine shop" title="Shop orders" subtitle="Every pharmacy order. Pharmacies handle them; refunds that failed need you." />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3.5 py-2 rounded-xl text-[14px] font-bold ${view === v.id ? "btn-ink" : "bg-white border border-line text-ink-2 hover:border-ink-3/40"}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {orders === null ? (
          <Skeleton className="h-48" />
        ) : orders.length === 0 ? (
          <div className="surface rounded-[24px] p-12 text-center">
            <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand-ink mb-4 mx-auto">
              <RiShoppingBag3Line size={24} />
            </div>
            <p className="font-bold text-ink">Nothing here</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o._id} className={`surface rounded-[22px] p-4 sm:p-5 ${o.refundError ? "!border-rose-200" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-ink">
                      {o.patientName} <span className="font-medium text-ink-3 text-[14px]">· {o.patientEmail}</span>
                    </p>
                    <p className="text-[13px] text-ink-3 flex items-center gap-1">
                      <RiStore2Line size={13} /> {o.pharmacyName} · {when(o.createdAt)} · {o.paymentMethod === "wallet" ? "wallet" : "card"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="num text-[17px] text-ink">{money(o.totalCents)}</p>
                    <Pill tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Pill>
                  </div>
                </div>
                <p className="text-[14px] text-ink-2 mt-2">
                  {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}
                  {o.items.some((i) => i.requiresPrescription) && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-bold text-video">
                      <RiFileList3Line size={12} /> prescription{o.rxCheck ? ` checked by ${o.rxCheck.name} (${o.rxCheck.license})` : ""}
                    </span>
                  )}
                </p>
                <p className="text-[13px] text-ink-3 mt-1">
                  Your commission {money(o.commissionCents)} · pharmacy gets {money(o.pharmacyEarningCents)}
                  {o.rejectReason ? ` · reason: ${o.rejectReason}` : ""}
                  {o.refund?.status === "refunded" ? ` · refunded ${money(o.refund.cents)} to ${o.refund.method === "wallet" ? "wallet" : "card"}` : ""}
                </p>
                {o.refundError && (
                  <p className="mt-2 text-[13px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 flex items-start gap-1.5">
                    <RiErrorWarningLine size={15} className="shrink-0" />
                    The card refund of {money(o.refund?.cents ?? o.totalCents)} failed ({o.refundError}). Refund it from the Stripe dashboard.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
