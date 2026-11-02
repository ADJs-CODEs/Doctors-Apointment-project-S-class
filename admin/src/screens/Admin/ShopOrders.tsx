"use client";

import { RiErrorWarningLine, RiFileList3Line, RiShoppingBag3Line, RiStore2Line } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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

const STATUS: Record<Status, { label: string; tone: string }> = {
  placed: { label: "Waiting for pharmacy", tone: "bg-sky-50 text-sky-700" },
  accepted: { label: "Accepted", tone: "bg-teal-50 text-teal-700" },
  packing: { label: "Packing", tone: "bg-teal-50 text-teal-700" },
  out_for_delivery: { label: "On the way", tone: "bg-violet-50 text-violet-700" },
  delivered: { label: "Delivered", tone: "bg-slate-100 text-slate-600" },
  rejected: { label: "Rejected", tone: "bg-orange-50 text-orange-700" },
  cancelled: { label: "Cancelled", tone: "bg-slate-100 text-slate-500" },
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
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
            <RiShoppingBag3Line size={20} />
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900">
            Shop <span className="text-teal-500 font-serif italic">orders</span>
          </h1>
        </div>
        <p className="text-slate-500 text-sm ml-12 mb-6">Every pharmacy order. Pharmacies handle them; refunds that failed need you.</p>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${view === v.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {orders === null ? (
          <div className="h-48 rounded-[28px] bg-slate-200/60 animate-pulse" />
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center">
            <p className="font-black text-slate-900">Nothing here</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o._id} className={`bg-white rounded-[24px] border p-4 sm:p-5 ${o.refundError ? "border-red-200" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">
                      {o.patientName} <span className="font-medium text-slate-400 text-sm">· {o.patientEmail}</span>
                    </p>
                    <p className="text-[12px] text-slate-500 flex items-center gap-1">
                      <RiStore2Line size={13} /> {o.pharmacyName} · {when(o.createdAt)} · {o.paymentMethod === "wallet" ? "wallet" : "card"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 tabular-nums">{money(o.totalCents)}</p>
                    <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS[o.status].tone}`}>{STATUS[o.status].label}</span>
                  </div>
                </div>
                <p className="text-[13px] text-slate-600 mt-2">
                  {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}
                  {o.items.some((i) => i.requiresPrescription) && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-violet-700">
                      <RiFileList3Line size={12} /> prescription{o.rxCheck ? ` checked by ${o.rxCheck.name} (${o.rxCheck.license})` : ""}
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-slate-400 mt-1">
                  Your commission {money(o.commissionCents)} · pharmacy gets {money(o.pharmacyEarningCents)}
                  {o.rejectReason ? ` · reason: ${o.rejectReason}` : ""}
                  {o.refund?.status === "refunded" ? ` · refunded ${money(o.refund.cents)} to ${o.refund.method === "wallet" ? "wallet" : "card"}` : ""}
                </p>
                {o.refundError && (
                  <p className="mt-2 text-[12px] font-bold text-red-700 bg-red-50 rounded-xl px-3 py-2 flex items-start gap-1.5">
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
