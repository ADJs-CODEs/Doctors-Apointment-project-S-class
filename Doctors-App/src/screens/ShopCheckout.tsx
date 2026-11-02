"use client";

import {
  RiAddLine,
  RiArrowLeftLine,
  RiBankCardLine,
  RiCapsuleLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiFileList3Line,
  RiMapPin2Line,
  RiShoppingBag3Line,
  RiSubtractLine,
  RiWallet3Line,
} from "@remixicon/react";
import { type FormEvent, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppContext } from "@/Context/AppContext";
import { Link, useNavigate } from "@/lib/navigation";
import type { AppContextType } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { basket, basketTotals, useBasket } from "@/utils/basket";

type Prescription = { appointmentId: string; medicineName: string; doctorName: string; slotDate: string };

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
// same idea as the server: the words that identify a medicine
const words = (s = "") =>
  s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !["tablet", "tablets", "capsule", "capsules", "syrup", "cream", "injection"].includes(w));
const prettyDate = (slot: string) => {
  const [d, m, y] = slot.split("_").map(Number);
  return d ? new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : slot;
};

/** Review the basket, link prescriptions, say where to deliver, and pay. */
export default function ShopCheckout() {
  const current = useBasket();
  const totals = basketTotals(current);
  const { userData } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null);
  const [linked, setLinked] = useState<Record<string, string>>({}); // productId -> appointmentId
  const [form, setForm] = useState({ address: "", phone: "", note: "" });
  const [payWith, setPayWith] = useState<"wallet" | "card">("card");
  const [walletCents, setWalletCents] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);

  // prefill from the profile once it's loaded
  useEffect(() => {
    if (!userData) return;
    setForm((f) => ({
      ...f,
      address: f.address || [userData.address?.line1, userData.address?.line2].filter(Boolean).join(", "),
      phone: f.phone || userData.phone || "",
    }));
  }, [userData]);

  useEffect(() => {
    axiosInstance
      .get(API_PATHS.SHOP.PRESCRIPTIONS, { silent: true } as any)
      .then(({ data }) => setPrescriptions(data.success ? data.prescriptions : []))
      .catch(() => setPrescriptions([]));
    axiosInstance
      .get(API_PATHS.WALLET.OVERVIEW, { silent: true } as any)
      .then(({ data }) => data.success && setWalletCents((data.fundCents ?? 0) + (data.coins ?? 0)))
      .catch(() => {});
  }, []);

  // each prescription-only item: the prescriptions that include it (latest first)
  const matches = useMemo(() => {
    const out: Record<string, Prescription[]> = {};
    for (const item of current?.items ?? []) {
      if (!item.requiresPrescription) continue;
      const mine = new Set([...words(item.name), ...words(item.genericName)]);
      out[item.productId] = (prescriptions ?? []).filter((p) => words(p.medicineName).some((w) => mine.has(w)));
    }
    return out;
  }, [current, prescriptions]);

  // pick the latest matching prescription automatically
  useEffect(() => {
    setLinked((l) => {
      const next = { ...l };
      for (const [productId, list] of Object.entries(matches)) {
        if (!next[productId] && list[0]) next[productId] = list[0].appointmentId;
      }
      return next;
    });
  }, [matches]);

  const missingRx = (current?.items ?? []).filter((i) => i.requiresPrescription && !linked[i.productId]);
  const walletShort = payWith === "wallet" && walletCents !== null && walletCents < totals.total;

  const placeOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!current || missingRx.length || walletShort) return;
    setPlacing(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.SHOP.ORDERS, {
        pharmacyId: current.pharmacy._id,
        items: current.items.map((i) => ({ productId: i.productId, quantity: i.quantity, prescriptionAppointmentId: linked[i.productId] })),
        delivery: form,
        origin: current.deliverTo.where === "current" ? current.deliverTo.point : undefined,
        payWith,
      });
      if (!data.success) return toast.error(data.message);
      basket.clear();
      if (data.session_url) window.location.href = data.session_url;
      else navigate(`/shop/orders/${data.orderId}?placed=1`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't place the order");
    } finally {
      setPlacing(false);
    }
  };

  if (!current) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <RiShoppingBag3Line size={40} className="mx-auto text-slate-300" />
        <p className="text-xl font-black text-slate-900 mt-3">Your basket is empty</p>
        <Link to="/shop" className="inline-block mt-4 px-5 py-3 rounded-2xl bg-teal-600 text-white font-bold">
          Go to the pharmacy shop
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={placeOrder} className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-900">
        <RiArrowLeftLine size={16} /> Keep shopping
      </Link>
      <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">Checkout</h1>
      <p className="text-slate-500 mt-1">
        From <strong className="text-slate-700">{current.pharmacy.name}</strong> · {current.pharmacy.distanceKm} km away
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-6 items-start">
        <div className="space-y-6">
          <section className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6">
            <h2 className="font-black text-slate-900 mb-3">Your basket</h2>
            <ul className="divide-y divide-slate-100">
              {current.items.map((i) => (
                <li key={i.productId} className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                      {i.image ? <img src={i.image} alt="" className="w-full h-full object-cover" /> : <RiCapsuleLine size={22} className="text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{i.name}</p>
                      <p className="text-[12px] text-slate-500">
                        {i.strength ? `${i.strength} · ` : ""}
                        {money(i.priceCents)} each
                      </p>
                    </div>
                    <div className="flex items-center rounded-xl border border-slate-200">
                      <button type="button" onClick={() => basket.setQuantity(i.productId, i.quantity - 1)} aria-label={`One less ${i.name}`} className="p-2 text-slate-500">
                        {i.quantity === 1 ? <RiDeleteBinLine size={16} /> : <RiSubtractLine size={16} />}
                      </button>
                      <span className="w-6 text-center font-black tabular-nums">{i.quantity}</span>
                      <button type="button" onClick={() => basket.setQuantity(i.productId, i.quantity + 1)} aria-label={`One more ${i.name}`} className="p-2 text-slate-500">
                        <RiAddLine size={16} />
                      </button>
                    </div>
                    <p className="w-20 text-right font-black text-slate-900 tabular-nums">{money(i.priceCents * i.quantity)}</p>
                  </div>

                  {i.requiresPrescription && (
                    <div className="mt-2 ml-0 sm:ml-17 rounded-2xl bg-violet-50/70 border border-violet-100 p-3">
                      <p className="text-[12px] font-black text-violet-800 flex items-center gap-1.5">
                        <RiFileList3Line size={14} /> Prescription-only: the pharmacist checks it against
                      </p>
                      {prescriptions === null ? (
                        <p className="text-[12px] text-slate-500 mt-1">Looking up your prescriptions…</p>
                      ) : matches[i.productId]?.length ? (
                        <select
                          value={linked[i.productId] ?? ""}
                          onChange={(e) => setLinked({ ...linked, [i.productId]: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm"
                        >
                          {matches[i.productId].map((p) => (
                            <option key={`${p.appointmentId}-${p.medicineName}`} value={p.appointmentId}>
                              {p.medicineName}, prescribed by {p.doctorName} on {prettyDate(p.slotDate)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[12px] text-red-700 mt-1">
                          None of our doctors has prescribed this for you, so it can&apos;t be ordered. Remove it, or{" "}
                          <Link to="/doctors" className="font-bold underline">
                            book a visit
                          </Link>
                          .
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6 space-y-3">
            <h2 className="font-black text-slate-900">Delivery</h2>
            <p className="text-[12px] text-slate-500 flex items-center gap-1.5">
              <RiMapPin2Line size={14} />
              {current.deliverTo.where === "current" ? "To where you were when you picked these" : "To your home address (from Settings)"}, within{" "}
              {current.pharmacy.name}&apos;s delivery area.
            </p>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Full address for the rider</span>
              <textarea
                required
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="House number, street, area, landmark"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 resize-none"
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Note for the rider (optional)</span>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="e.g. call when you arrive"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6 lg:sticky lg:top-24 space-y-4">
          <h2 className="font-black text-slate-900">Pay</h2>
          <div className="space-y-2">
            {(
              [
                ["card", "Card", RiBankCardLine, "Pay securely with Stripe"],
                ["wallet", "Wallet", RiWallet3Line, walletCents === null ? "Care fund first, then coins" : `You have ${money(walletCents)}`],
              ] as const
            ).map(([key, label, Icon, hint]) => (
              <label
                key={key}
                className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer ${payWith === key ? "border-teal-500 bg-teal-50/60" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <input type="radio" name="pay" className="sr-only" checked={payWith === key} onChange={() => setPayWith(key)} />
                <Icon size={20} className="text-teal-600 shrink-0" />
                <span>
                  <span className="block font-black text-slate-900 text-sm">{label}</span>
                  <span className="block text-[12px] text-slate-500">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          <dl className="text-sm space-y-1.5 border-t border-slate-100 pt-4">
            <div className="flex justify-between">
              <dt className="text-slate-500">Items ({totals.count})</dt>
              <dd className="tabular-nums">{money(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivery</dt>
              <dd className="tabular-nums">{current.pharmacy.deliveryFeeCents ? money(current.pharmacy.deliveryFeeCents) : "Free"}</dd>
            </div>
            <div className="flex justify-between text-lg font-black text-slate-900 pt-1">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(totals.total)}</dd>
            </div>
          </dl>

          {missingRx.length > 0 && prescriptions !== null && (
            <p className="flex gap-2 text-[12px] text-red-700 bg-red-50 rounded-xl p-3">
              <RiErrorWarningLine size={16} className="shrink-0" /> Remove {missingRx.map((i) => i.name).join(", ")}: it needs a prescription from our doctors.
            </p>
          )}
          {walletShort && (
            <p className="flex gap-2 text-[12px] text-orange-700 bg-orange-50 rounded-xl p-3">
              <RiErrorWarningLine size={16} className="shrink-0" /> Not enough in your wallet. Pay by card, or{" "}
              <Link to="/wallet" className="font-bold underline">
                top up
              </Link>
              .
            </p>
          )}

          <button
            type="submit"
            disabled={placing || missingRx.length > 0 || walletShort}
            className="w-full py-4 rounded-2xl bg-teal-600 text-white font-black hover:bg-teal-700 disabled:opacity-40"
          >
            {placing ? "Placing order…" : payWith === "card" ? `Pay ${money(totals.total)} by card` : `Pay ${money(totals.total)} from wallet`}
          </button>
          <p className="text-[11px] text-slate-400 text-center">You can cancel for a full refund until the pharmacy accepts your order.</p>
        </aside>
      </div>
    </form>
  );
}
