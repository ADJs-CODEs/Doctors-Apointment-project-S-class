"use client";

import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiForbidLine,
  RiMapPin2Line,
  RiStore2Line,
  RiTeamLine,
  RiTimeLine,
  RiTruckLine,
} from "@remixicon/react";
import { Link } from "@/lib/navigation";
import { usePharmacy } from "../../context/PharmacyContext";

const money = (cents: number) => (cents ? `$${(cents / 100).toFixed(2)}` : "Free");

const STATUS = {
  pending: {
    Icon: RiTimeLine,
    tone: "bg-amber-50 border-amber-200 text-amber-900",
    iconTone: "text-amber-600",
    title: "Waiting for approval",
    text: "The clinic is checking your licence. Patients can't see you yet. Meanwhile, set up your delivery area and add your staff.",
  },
  approved: {
    Icon: RiCheckboxCircleLine,
    tone: "bg-teal-50 border-teal-200 text-teal-900",
    iconTone: "text-teal-600",
    title: "Approved",
    text: "Patients in your delivery area can see your listed products and order them. New orders appear under Orders.",
  },
  rejected: {
    Icon: RiErrorWarningLine,
    tone: "bg-orange-50 border-orange-200 text-orange-900",
    iconTone: "text-orange-600",
    title: "Not approved",
    text: "Your application wasn't approved. Contact the clinic if you think this is a mistake.",
  },
  suspended: {
    Icon: RiForbidLine,
    tone: "bg-red-50 border-red-200 text-red-900",
    iconTone: "text-red-600",
    title: "Suspended",
    text: "Patients can't see or order from you until the clinic lifts the suspension.",
  },
} as const;

/** The pharmacy's home: where it stands with the clinic, and its delivery setup. */
export default function PharmacyHome() {
  const { staff, pharmacy } = usePharmacy();
  if (!staff || !pharmacy) {
    return <div className="p-6 md:p-10"><div className="h-40 rounded-[28px] bg-slate-200/60 animate-pulse max-w-4xl" /></div>;
  }
  const s = STATUS[pharmacy.status];
  const owner = staff.role === "owner";

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
              <RiStore2Line size={20} />
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900">{pharmacy.name}</h1>
            {pharmacy.operatedByClinic && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1 rounded-full">Clinic pharmacy</span>
            )}
          </div>
          <p className="text-slate-500 text-sm ml-12">
            Hi {staff.name.split(" ")[0]}, you&apos;re signed in as <strong className="text-slate-700">{staff.role}</strong>.
          </p>
        </div>

        <section className={`flex gap-4 rounded-[28px] border p-5 sm:p-6 ${s.tone}`}>
          <s.Icon size={26} className={`shrink-0 ${s.iconTone}`} />
          <div>
            <p className="font-black text-lg">{s.title}</p>
            <p className="text-sm opacity-90 mt-0.5">{s.text}</p>
            {pharmacy.statusNote && pharmacy.status !== "approved" && (
              <p className="mt-3 text-sm bg-white/70 rounded-xl px-3 py-2">
                <span className="font-bold">Reason from the clinic:</span> {pharmacy.statusNote}
              </p>
            )}
          </div>
        </section>

        <div className="grid sm:grid-cols-2 gap-4">
          <section className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <RiTruckLine size={18} />
              <p className="text-[10px] font-black uppercase tracking-wider">Delivery</p>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">Up to {pharmacy.deliveryRadiusKm} km</p>
            <p className="text-sm text-slate-500">Delivery fee: {money(pharmacy.deliveryFeeCents)}</p>
            <p className={`mt-3 flex items-start gap-1.5 text-[12px] ${pharmacy.located ? "text-slate-500" : "text-orange-700 font-bold"}`}>
              <RiMapPin2Line size={15} className="shrink-0 mt-0.5" />
              {pharmacy.located
                ? [pharmacy.address.line1, pharmacy.address.line2].filter(Boolean).join(", ")
                : "We couldn't find your address on the map, so patients can't be matched to you. Add the area and city."}
            </p>
            {owner && (
              <Link to="/pharmacy-settings" className="inline-block mt-4 text-[12px] font-black text-teal-700 hover:underline">
                Change delivery settings →
              </Link>
            )}
          </section>

          <section className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <RiTeamLine size={18} />
              <p className="text-[10px] font-black uppercase tracking-wider">Your role</p>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 capitalize">{staff.role}</p>
            <p className="text-sm text-slate-500 mt-1">
              {staff.role === "owner"
                ? "You manage staff, delivery settings, earnings and withdrawals."
                : staff.role === "pharmacist"
                  ? "You'll approve orders for prescription-only medicines."
                  : "You'll manage products and stock, pack orders and update deliveries."}
            </p>
            {owner && (
              <Link to="/pharmacy-staff" className="inline-block mt-4 text-[12px] font-black text-teal-700 hover:underline">
                Manage staff →
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
