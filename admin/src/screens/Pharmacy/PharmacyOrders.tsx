"use client";

import {
  RiCapsuleLine,
  RiCheckLine,
  RiCloseLine,
  RiFileList3Line,
  RiInboxArchiveLine,
  RiMapPin2Line,
  RiPhoneLine,
  RiShieldCheckLine,
  RiTruckLine,
} from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { usePharmacy } from "../../context/PharmacyContext";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Status = "placed" | "accepted" | "packing" | "out_for_delivery" | "delivered" | "rejected" | "cancelled";

type Order = {
  _id: string;
  patientName: string;
  items: {
    productId: string;
    name: string;
    strength?: string;
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
  rxCheck?: { name: string; license: string; at: string };
  needsPharmacist: boolean;
  rejectReason?: string;
  history: { status: string; at: string; name?: string }[];
  createdAt: string;
};

const VIEWS = [
  { id: "new", label: "New" },
  { id: "active", label: "In progress" },
  { id: "done", label: "Done" },
] as const;

const NEXT: Partial<Record<Status, { to: Status; label: string; Icon: typeof RiCheckLine }>> = {
  accepted: { to: "packing", label: "Start packing", Icon: RiInboxArchiveLine },
  packing: { to: "out_for_delivery", label: "Out for delivery", Icon: RiTruckLine },
  out_for_delivery: { to: "delivered", label: "Mark delivered", Icon: RiCheckLine },
};

const STATUS_LABEL: Record<Status, string> = {
  placed: "New",
  accepted: "Accepted",
  packing: "Packing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled by patient",
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const prettyDate = (slot: string) => {
  const [d, m, y] = slot.split("_").map(Number);
  return d ? new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : slot;
};

/** The pharmacy's orders: accept (a pharmacist for prescriptions), pack, deliver. */
export default function PharmacyOrders() {
  const { staff } = usePharmacy();
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("new");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [counts, setCounts] = useState({ new: 0, active: 0 });
  const isPharmacist = !!staff?.pharmacistLicense && (staff.role === "pharmacist" || staff.role === "owner");

  const load = useCallback(
    async (silent = false) => {
      try {
        const { data } = await axiosInstance.get(API_PATHS.PHARMACY.ORDERS, { params: { view }, ...(silent && { silent: true }) } as any);
        if (data.success) {
          setOrders(data.orders);
          setCounts(data.counts);
        } else toast.error(data.message);
      } catch (err: any) {
        if (!silent) toast.error(err.response?.data?.message || "Couldn't load orders");
      }
    },
    [view],
  );

  useEffect(() => {
    setOrders(null);
    load();
    // new orders show up without a refresh
    const t = setInterval(() => load(true), 20_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
            <RiTruckLine size={20} />
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900">
            Orders
          </h1>
        </div>
        <p className="text-slate-500 text-sm ml-12 mb-6">
          Accept new orders, pack them and update the patient as they go. Orders with prescription-only medicines need a pharmacist.
        </p>

        <div className="flex gap-1.5 mb-5">
          {VIEWS.map((v) => {
            const n = v.id === "new" ? counts.new : v.id === "active" ? counts.active : 0;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                  view === v.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {v.label}
                {n > 0 && (
                  <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center ${v.id === "new" ? "bg-rose-500 text-white" : "bg-teal-500 text-white"}`}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {orders === null ? (
          <div className="h-48 rounded-[28px] bg-slate-200/60 animate-pulse" />
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center">
            <p className="font-black text-slate-900">Nothing here</p>
            <p className="text-sm text-slate-400 mt-1">{view === "new" ? "New orders appear here as soon as patients pay." : "No orders in this list."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <OrderCard key={o._id} o={o} isPharmacist={isPharmacist} onChanged={() => load(true)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ o, isPharmacist, onChanged }: { o: Order; isPharmacist: boolean; onChanged: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const blockedForRx = o.status === "placed" && o.needsPharmacist && !isPharmacist;

  const act = async (request: Promise<{ data: any }>) => {
    setBusy(true);
    try {
      const { data } = await request;
      if (data.success) {
        toast.success(data.message);
        onChanged();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const next = NEXT[o.status];

  return (
    <div className={`bg-white rounded-[28px] border shadow-sm p-5 sm:p-6 ${o.status === "placed" ? "border-rose-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-slate-900">{o.patientName}</p>
          <p className="text-[12px] text-slate-400">
            Order {o._id.slice(-6).toUpperCase()} · {when(o.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-slate-900 tabular-nums">{money(o.totalCents)}</p>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{STATUS_LABEL[o.status]}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {o.items.map((i) => (
          <li key={i.productId} className="rounded-2xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <RiCapsuleLine size={16} className="text-slate-400 shrink-0" />
              <p className="flex-1 text-sm">
                <span className="font-black text-slate-900">{i.quantity} ×</span> {i.name}
                {i.strength && <span className="text-slate-500"> · {i.strength}</span>}
              </p>
              <p className="text-sm font-bold tabular-nums text-slate-700">{money(i.priceCents * i.quantity)}</p>
            </div>
            {i.prescription && (
              <p className="mt-1.5 ml-6 text-[12px] text-violet-800 flex items-start gap-1.5">
                <RiFileList3Line size={14} className="shrink-0 mt-0.5" />
                <span>
                  Prescription-only. Prescribed as <strong>{i.prescription.medicineName}</strong> by {i.prescription.doctorName} on{" "}
                  {prettyDate(i.prescription.slotDate)}.
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="grid sm:grid-cols-2 gap-2 mt-3 text-sm">
        <p className="flex items-start gap-1.5 text-slate-700">
          <RiMapPin2Line size={16} className="text-teal-600 shrink-0 mt-0.5" />
          <span>
            {o.delivery.address}
            {o.delivery.note && <span className="block text-[12px] text-slate-500">“{o.delivery.note}”</span>}
          </span>
        </p>
        <p className="flex items-center gap-1.5 text-slate-700">
          <RiPhoneLine size={16} className="text-teal-600" />
          <a href={`tel:${o.delivery.phone}`} className="font-bold hover:underline">
            {o.delivery.phone}
          </a>
        </p>
      </div>

      {o.rxCheck && (
        <p className="mt-3 text-[12px] text-teal-800 bg-teal-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
          <RiShieldCheckLine size={15} /> Prescriptions checked by {o.rxCheck.name} (licence {o.rxCheck.license}), {when(o.rxCheck.at)}
        </p>
      )}
      {o.rejectReason && <p className="mt-3 text-sm text-slate-500 italic">Reason: “{o.rejectReason}”</p>}

      {o.status === "placed" &&
        (rejecting ? (
          <div className="mt-4 rounded-2xl border border-slate-200 p-4 space-y-3">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why you can't take it (the patient sees this, and is refunded in full)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => act(axiosInstance.post(API_PATHS.PHARMACY.ORDER_REJECT(o._id), { reason }))}
                disabled={busy || !reason.trim()}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-40"
              >
                Reject and refund
              </button>
              <button onClick={() => setRejecting(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {blockedForRx && (
              <p className="text-[12px] font-bold text-violet-800 bg-violet-50 rounded-xl px-3 py-2 mb-2">
                This order has prescription-only medicines: a pharmacist on your team must check and accept it.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => act(axiosInstance.post(API_PATHS.PHARMACY.ORDER_ACCEPT(o._id)))}
                disabled={busy || blockedForRx}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-40"
              >
                <RiCheckLine size={16} /> {o.needsPharmacist ? "Prescriptions checked, accept" : "Accept"}
              </button>
              <button
                onClick={() => setRejecting(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <RiCloseLine size={16} /> Reject
              </button>
            </div>
          </div>
        ))}

      {next && (
        <button
          onClick={() => act(axiosInstance.post(API_PATHS.PHARMACY.ORDER_STATUS(o._id), { status: next.to }))}
          disabled={busy}
          className="mt-4 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-teal-600 disabled:opacity-50"
        >
          <next.Icon size={16} /> {next.label}
        </button>
      )}
    </div>
  );
}
