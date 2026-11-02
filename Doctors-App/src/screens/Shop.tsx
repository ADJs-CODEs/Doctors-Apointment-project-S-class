"use client";

import {
  RiAddLine,
  RiArrowRightLine,
  RiCapsuleLine,
  RiCloseLine,
  RiFileList3Line,
  RiHome4Line,
  RiMapPin2Line,
  RiNavigationLine,
  RiSearchLine,
  RiShoppingBag3Line,
  RiStore2Line,
  RiSubtractLine,
  RiTruckLine,
} from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { currentPosition, locationAllowed } from "@/hooks/useClinicDistance";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Link } from "@/lib/navigation";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { basket, basketTotals, useBasket } from "@/utils/basket";
import { toast } from "sonner";

type ShopPharmacy = {
  _id: string;
  name: string;
  address: { line1: string; line2?: string };
  operatedByClinic: boolean;
  distanceKm: number;
  deliveryFeeCents: number;
  productsInStock: number;
};

type ShopProduct = {
  _id: string;
  name: string;
  genericName?: string;
  strength?: string;
  packSize?: string;
  category: string;
  description?: string;
  priceCents: number;
  image?: string;
  requiresPrescription: boolean;
  inStock: boolean;
  prescribedForYou: boolean;
  pharmacy: { _id: string; name: string; distanceKm: number; deliveryFeeCents: number };
};

type Where = "current" | "home" | "other";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const fee = (cents: number) => (cents ? `${money(cents)} delivery` : "Free delivery");

/** The medicine shop: products from certified pharmacies that deliver to the patient. */
export default function Shop() {
  const settings = useUserSettings();
  const homeAddress = settings?.maps.homeAddress ?? "";
  const [where, setWhere] = useState<Where | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ pharmacies: ShopPharmacy[]; products: ShopProduct[]; categories: { id: string; label: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [pharmacyId, setPharmacyId] = useState("");
  const [open, setOpen] = useState<ShopProduct | null>(null);
  const origin = useRef<{ lat: number; lng: number } | undefined>(undefined);
  // "Another address" (ordering for someone else): what they typed, and the box to type it in
  const [otherAddress, setOtherAddress] = useState("");
  const [addressBox, setAddressBox] = useState(false);
  // the "Change location" choices under the delivery bar
  const [chooser, setChooser] = useState(false);
  // the exact point the server matched pharmacies for; the basket delivers there
  const deliveryPoint = useRef<{ lat: number; lng: number } | undefined>(undefined);

  // where to deliver: their location if they've already allowed it, else home, else ask
  useEffect(() => {
    if (where || !settings) return;
    locationAllowed().then((allowed) => {
      if (allowed) locateMe();
      else if (homeAddress) setWhere("home");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const locateMe = async () => {
    setLocating(true);
    setError(null);
    try {
      origin.current = await currentPosition();
      setWhere("current");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLocating(false);
    }
  };

  // search as they type, after a short pause
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    if (!where) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.post(
        API_PATHS.SHOP.BROWSE,
        {
          origin: where === "current" ? origin.current : undefined,
          address: where === "other" ? otherAddress : undefined,
          q: query || undefined,
          category: category || undefined,
          pharmacyId: pharmacyId || undefined,
        },
        { silent: true } as any,
      );
      if (data.success) {
        setData(data);
        deliveryPoint.current = data.point;
      } else setError(data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Couldn't load the shop");
    } finally {
      setLoading(false);
    }
  }, [where, otherAddress, query, category, pharmacyId]);

  const useOtherAddress = (address: string) => {
    setOtherAddress(address);
    setWhere("other");
    setPharmacyId("");
    setAddressBox(false);
  };

  useEffect(() => {
    load();
  }, [load]);

  const pharmacy = data?.pharmacies.find((p) => p._id === pharmacyId);
  const current = useBasket();
  const totals = basketTotals(current);
  // adding from a different pharmacy than what's in the basket: ask first
  const [switching, setSwitching] = useState<{ p: ShopProduct; quantity: number } | null>(null);

  const addToBasket = (p: ShopProduct, quantity = 1, replace = false) => {
    const added = basket.add(
      { productId: p._id, name: p.name, genericName: p.genericName, strength: p.strength, image: p.image, priceCents: p.priceCents, requiresPrescription: p.requiresPrescription },
      { _id: p.pharmacy._id, name: p.pharmacy.name, deliveryFeeCents: p.pharmacy.deliveryFeeCents, distanceKm: p.pharmacy.distanceKm },
      { where: where ?? "home", point: deliveryPoint.current, label: where === "other" ? otherAddress : undefined },
      quantity,
      replace,
    );
    if (!added) return setSwitching({ p, quantity });
    setOpen(null);
    setSwitching(null);
    toast.success(`${p.name} added to your basket`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <div className="mb-5">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900">
          Pharmacy <span className="text-teal-600 font-serif italic">shop</span>
        </h1>
        <p className="text-slate-500 mt-1">
          Medicines from certified pharmacies that deliver to you.{" "}
          <Link to="/shop/orders" className="font-bold text-teal-700 hover:underline whitespace-nowrap">
            My orders →
          </Link>
        </p>
      </div>

      {/* where we're delivering: always in plain sight, one tap to change */}
      {where && (
        <div className="mb-5 rounded-3xl border-2 border-teal-100 bg-teal-50/60 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              {where === "current" ? <RiNavigationLine size={20} /> : where === "home" ? <RiHome4Line size={20} /> : <RiMapPin2Line size={20} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-teal-700">Delivering to</p>
              <p className="font-black text-slate-900 truncate">
                {where === "current" ? "Where you are now" : where === "home" ? "Your home address" : otherAddress}
              </p>
              {where === "home" && homeAddress && <p className="text-[12px] text-slate-500 truncate">{homeAddress}</p>}
            </div>
            <button
              onClick={() => setChooser((c) => !c)}
              aria-expanded={chooser}
              className="shrink-0 px-5 py-3 rounded-2xl bg-white border-2 border-teal-600 text-teal-700 font-black hover:bg-teal-600 hover:text-white transition-colors"
            >
              {chooser ? "Close" : "Change location"}
            </button>
          </div>

          {chooser && (
            <div className="grid sm:grid-cols-3 gap-2 mt-4">
              {[
                {
                  key: "current",
                  Icon: RiNavigationLine,
                  title: locating ? "Finding you…" : "Where I am now",
                  hint: "Uses your phone or browser location",
                  onClick: async () => {
                    await locateMe();
                    setChooser(false);
                  },
                },
                ...(homeAddress
                  ? [
                      {
                        key: "home",
                        Icon: RiHome4Line,
                        title: "My home address",
                        hint: homeAddress,
                        onClick: () => {
                          setWhere("home");
                          setChooser(false);
                        },
                      },
                    ]
                  : []),
                {
                  key: "other",
                  Icon: RiMapPin2Line,
                  title: "Another address",
                  hint: "Ordering for someone else, or your office",
                  onClick: () => {
                    setAddressBox(true);
                    setChooser(false);
                  },
                },
              ].map((o) => (
                <button
                  key={o.key}
                  onClick={o.onClick}
                  disabled={o.key === "current" && locating}
                  className={`text-left rounded-2xl border-2 p-4 bg-white transition-colors ${where === o.key ? "border-teal-500" : "border-slate-200 hover:border-teal-300"}`}
                >
                  <o.Icon size={20} className="text-teal-600" />
                  <p className="font-black text-slate-900 mt-2">{o.title}</p>
                  <p className="text-[12px] text-slate-500 truncate">{o.hint}</p>
                </button>
              ))}
              {!homeAddress && (
                <Link to="/account-settings" className="text-left rounded-2xl border-2 border-dashed border-slate-200 p-4 hover:border-teal-300">
                  <RiHome4Line size={20} className="text-slate-400" />
                  <p className="font-black text-slate-700 mt-2">Add a home address</p>
                  <p className="text-[12px] text-slate-500">In Settings, to use it every time</p>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {addressBox && (
        <AddressBox initial={otherAddress} onUse={useOtherAddress} onCancel={() => setAddressBox(false)} />
      )}

      {!where ? (
        <WhereToDeliver
          homeAddress={homeAddress}
          locating={locating}
          error={error}
          onLocation={locateMe}
          onHome={() => setWhere("home")}
          onOther={() => setAddressBox(true)}
        />
      ) : (
        <>
          <label className="relative block mb-4">
            <RiSearchLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search medicines, e.g. paracetamol"
              className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 text-base outline-none focus:border-teal-400"
            />
          </label>

          {/* pharmacies near them: tap one to see only theirs */}
          {data && data.pharmacies.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              {data.pharmacies.map((p) => {
                const active = p._id === pharmacyId;
                return (
                  <button
                    key={p._id}
                    onClick={() => setPharmacyId(active ? "" : p._id)}
                    aria-pressed={active}
                    className={`shrink-0 w-60 text-left rounded-2xl border p-4 transition-colors ${active ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-200"}`}
                  >
                    <p className="font-black text-slate-900 flex items-center gap-1.5">
                      <RiStore2Line size={16} className="text-teal-600 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </p>
                    {p.operatedByClinic && <p className="text-[10px] font-black uppercase tracking-wider text-teal-700 mt-1">Our clinic&apos;s pharmacy</p>}
                    <p className="text-[12px] text-slate-500 mt-1">
                      {p.distanceKm} km away · {fee(p.deliveryFeeCents)}
                    </p>
                    <p className="text-[12px] text-slate-400">{p.productsInStock} products in stock</p>
                  </button>
                );
              })}
            </div>
          )}

          {data && data.pharmacies.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
              {[{ id: "", label: "Everything" }, ...data.categories].map((c) => (
                <button
                  key={c.id || "all"}
                  onClick={() => setCategory(c.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold ${category === c.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {error ? (
            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-6 text-orange-900">
              <p className="font-black">{error}</p>
              <p className="text-sm mt-1">Pick another way to deliver above, or type an address:</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => setAddressBox(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-orange-200 text-sm font-bold text-orange-800 hover:bg-orange-100">
                  <RiMapPin2Line size={15} /> Another address
                </button>
                <Link to="/account-settings" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-orange-700 underline">
                  Add or fix your home address
                </Link>
              </div>
            </div>
          ) : !data ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-64 rounded-3xl bg-slate-200/60 animate-pulse" />
              ))}
            </div>
          ) : data.pharmacies.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <RiTruckLine size={32} className="mx-auto text-slate-300" />
              <p className="font-black text-slate-900 mt-3">No pharmacy delivers here yet</p>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                We&apos;re adding certified pharmacies area by area. Deliver somewhere else instead, like a relative&apos;s place or your office:
              </p>
              {/* switch right here, without hunting for the toggle at the top */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center mt-5">
                <button
                  onClick={() => {
                    setAddressBox(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 text-white font-bold hover:bg-teal-700"
                >
                  <RiMapPin2Line size={18} /> Use another address
                </button>
                {where !== "current" && (
                  <button
                    onClick={locateMe}
                    disabled={locating}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <RiNavigationLine size={18} /> {locating ? "Finding you…" : "Use where I am"}
                  </button>
                )}
                {where !== "home" && homeAddress && (
                  <button
                    onClick={() => setWhere("home")}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <RiHome4Line size={18} /> Use my home address
                  </button>
                )}
              </div>
            </div>
          ) : data.products.length === 0 ? (
            <p className="text-center text-slate-400 py-12">
              {query ? `Nothing matches “${query}”${pharmacy ? ` at ${pharmacy.name}` : ""}.` : "Nothing here yet."}
            </p>
          ) : (
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
              {data.products.map((p) => (
                <ProductCard key={p._id} p={p} onOpen={() => setOpen(p)} onAdd={() => addToBasket(p)} />
              ))}
            </div>
          )}

          <p className="text-[12px] text-slate-400 mt-8 mb-24 text-center">
            Prescription-only medicines need a prescription from one of our doctors, checked by the pharmacist before it&apos;s sent.
          </p>
        </>
      )}

      {/* the basket, always one tap away (sits above the phone tab bar) */}
      {current && (
        <Link
          to="/shop/checkout"
          className="fixed z-40 left-4 right-4 bottom-24 lg:bottom-6 lg:left-auto lg:right-8 lg:w-96 flex items-center justify-between gap-3 rounded-2xl bg-slate-900 text-white px-5 py-4 shadow-2xl"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="relative">
              <RiShoppingBag3Line size={22} />
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-teal-500 text-[11px] font-black flex items-center justify-center">
                {totals.count}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block font-black">Basket · {money(totals.total)}</span>
              <span className="block text-[11px] text-slate-400 truncate">from {current.pharmacy.name}</span>
            </span>
          </span>
          <span className="flex items-center gap-1 font-black text-teal-300 shrink-0">
            Checkout <RiArrowRightLine size={18} />
          </span>
        </Link>
      )}

      {open && <ProductDetails p={open} onClose={() => setOpen(null)} onAdd={(quantity) => addToBasket(open, quantity)} />}

      {switching && current && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setSwitching(null)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-[28px] p-6">
            <p className="text-lg font-black text-slate-900">Start a new basket?</p>
            <p className="text-sm text-slate-500 mt-1">
              Your basket has items from <strong>{current.pharmacy.name}</strong>. Each order comes from one pharmacy, so adding this from{" "}
              <strong>{switching.p.pharmacy.name}</strong> empties it.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => addToBasket(switching.p, switching.quantity, true)}
                className="flex-1 py-3 rounded-2xl bg-teal-600 text-white font-black hover:bg-teal-700"
              >
                Start new basket
              </button>
              <button onClick={() => setSwitching(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600">
                Keep current
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WhereToDeliver({
  homeAddress,
  locating,
  error,
  onLocation,
  onHome,
  onOther,
}: {
  homeAddress: string;
  locating: boolean;
  error: string | null;
  onLocation: () => void;
  onHome: () => void;
  onOther: () => void;
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-10 text-center max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
        <RiMapPin2Line size={28} />
      </div>
      <p className="text-xl font-black text-slate-900 mt-4">Where should we deliver?</p>
      <p className="text-sm text-slate-500 mt-1">
        We show pharmacies that deliver there. Ordering for someone else? Use their address. Your location is only used to find pharmacies; it
        isn&apos;t saved.
      </p>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 justify-center mt-6">
        <button
          onClick={onLocation}
          disabled={locating}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-60"
        >
          <RiNavigationLine size={18} /> {locating ? "Finding you…" : "Use where I am"}
        </button>
        {homeAddress ? (
          <button onClick={onHome} className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50">
            <RiHome4Line size={18} /> My home address
          </button>
        ) : (
          <Link to="/account-settings" className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50">
            <RiHome4Line size={18} /> Add a home address
          </Link>
        )}
        <button onClick={onOther} className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50">
          <RiMapPin2Line size={18} /> Another address
        </button>
      </div>
      {error && <p className="text-sm text-orange-700 mt-4">{error}</p>}
    </div>
  );
}

/** Type any address (e.g. a relative's) to see the pharmacies that deliver there. */
function AddressBox({ initial, onUse, onCancel }: { initial: string; onUse: (address: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onUse(value.trim());
      }}
      className="mb-6 rounded-3xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5"
    >
      <p className="font-black text-slate-900">Deliver to another address</p>
      <p className="text-[12px] text-slate-500">Include the area and city, e.g. &quot;12 Allen Avenue, Ikeja, Lagos&quot;.</p>
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Street, area, city"
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-teal-400"
        />
        <button type="submit" disabled={!value.trim()} className="px-5 py-3 rounded-2xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-40">
          Show pharmacies there
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-3 rounded-2xl text-slate-500 font-bold hover:bg-white">
          Cancel
        </button>
      </div>
    </form>
  );
}

function RxBadge({ p }: { p: ShopProduct }) {
  if (!p.requiresPrescription && !p.prescribedForYou) return null;
  return p.prescribedForYou ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
      <RiFileList3Line size={11} /> Prescribed for you
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
      <RiFileList3Line size={11} /> Needs a prescription
    </span>
  );
}

/** Prescription-only items can only go in the basket if one of our doctors prescribed them. */
const canBuy = (p: ShopProduct) => p.inStock && (!p.requiresPrescription || p.prescribedForYou);

function ProductCard({ p, onOpen, onAdd }: { p: ShopProduct; onOpen: () => void; onAdd: () => void }) {
  return (
    <div
      className={`text-left rounded-3xl border bg-white overflow-hidden flex flex-col hover:shadow-md transition-shadow ${p.prescribedForYou ? "border-teal-300" : "border-slate-200"}`}
    >
      <button onClick={onOpen} className="text-left flex flex-col flex-1">
        <div className="relative w-full aspect-[4/3] bg-slate-50 flex items-center justify-center">
          {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <RiCapsuleLine size={40} className="text-slate-200" />}
          {!p.inStock && (
            <span className="absolute inset-x-3 bottom-3 text-center text-[11px] font-black uppercase tracking-wider bg-white/90 text-slate-600 rounded-full py-1">
              Out of stock
            </span>
          )}
        </div>
        <div className="p-3 sm:p-4 flex flex-col flex-1 w-full">
          <RxBadge p={p} />
          <p className="font-black text-slate-900 leading-snug mt-1">{p.name}</p>
          <p className="text-[12px] text-slate-500 line-clamp-1">{[p.strength, p.packSize].filter(Boolean).join(" · ") || p.genericName}</p>
          <p className="text-[11px] text-slate-400 truncate mt-auto pt-2">
            {p.pharmacy.name} · {p.pharmacy.distanceKm} km
          </p>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pb-3 sm:pb-4">
        <p className="text-lg font-black text-slate-900">{money(p.priceCents)}</p>
        {canBuy(p) && (
          <button
            onClick={onAdd}
            aria-label={`Add ${p.name} to basket`}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-teal-600 text-white text-[12px] font-black hover:bg-teal-700 active:scale-95"
          >
            <RiAddLine size={15} /> Add
          </button>
        )}
      </div>
    </div>
  );
}

function ProductDetails({ p, onClose, onAdd }: { p: ShopProduct; onClose: () => void; onAdd: (quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={p.name}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] overflow-y-auto"
      >
        <div className="relative aspect-video bg-slate-50 flex items-center justify-center">
          {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <RiCapsuleLine size={56} className="text-slate-200" />}
          <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-slate-600 hover:bg-white">
            <RiCloseLine size={20} />
          </button>
        </div>
        <div className="p-6">
          <RxBadge p={p} />
          <p className="text-2xl font-black text-slate-900 mt-1">{p.name}</p>
          <p className="text-sm text-slate-500">{[p.genericName, p.strength, p.packSize].filter(Boolean).join(" · ")}</p>
          <p className="text-3xl font-black text-slate-900 mt-4">{money(p.priceCents)}</p>
          {p.description && <p className="text-sm text-slate-600 mt-3 whitespace-pre-line">{p.description}</p>}

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <RiStore2Line size={16} className="text-teal-600" /> {p.pharmacy.name}
            </p>
            <p className="text-slate-500 mt-0.5">
              {p.pharmacy.distanceKm} km away · {fee(p.pharmacy.deliveryFeeCents)} · {p.inStock ? "In stock" : "Out of stock"}
            </p>
          </div>

          {p.requiresPrescription && (
            <p className="mt-4 text-[13px] text-slate-600 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              {p.prescribedForYou
                ? "One of our doctors prescribed this for you. The pharmacist checks the prescription before sending it."
                : "This is a prescription-only medicine. You'll need a prescription from one of our doctors to order it."}
              {!p.prescribedForYou && (
                <Link to="/doctors" className="block mt-2 font-bold text-violet-700 underline">
                  Book a visit
                </Link>
              )}
            </p>
          )}

          {canBuy(p) ? (
            <div className="mt-5 flex gap-3">
              <div className="flex items-center rounded-2xl border border-slate-200">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="One less" className="p-3 text-slate-500 hover:text-slate-900">
                  <RiSubtractLine size={18} />
                </button>
                <span className="w-8 text-center font-black tabular-nums" aria-live="polite">
                  {quantity}
                </span>
                <button onClick={() => setQuantity((q) => Math.min(20, q + 1))} aria-label="One more" className="p-3 text-slate-500 hover:text-slate-900">
                  <RiAddLine size={18} />
                </button>
              </div>
              <button
                onClick={() => onAdd(quantity)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-teal-600 text-white font-black hover:bg-teal-700"
              >
                <RiShoppingBag3Line size={18} /> Add · {money(p.priceCents * quantity)}
              </button>
            </div>
          ) : (
            <button disabled className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-200 text-slate-500 font-black">
              <RiShoppingBag3Line size={18} /> {p.inStock ? "Needs a prescription from our doctors" : "Out of stock"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
