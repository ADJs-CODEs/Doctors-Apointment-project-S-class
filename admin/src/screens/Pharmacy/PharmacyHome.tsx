"use client";

import {
  RiArrowRightSLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiForbidLine,
  RiMapPin2Line,
  RiTeamLine,
  RiTimeLine,
  RiTruckLine,
} from "@remixicon/react";
import { Link } from "@/lib/navigation";
import { PageHeader, Pill, Skeleton } from "../../components/panel";
import { usePharmacy } from "../../context/PharmacyContext";

const money = (cents: number) => (cents ? `$${(cents / 100).toFixed(2)}` : "Free");

const STATUS = {
  pending: {
    Icon: RiTimeLine,
    tone: "bg-amber-50 border-amber-200",
    iconTone: "text-amber-600",
    title: "Waiting for approval",
    text: "The clinic is checking your licence. Patients can't see you yet. Meanwhile, set up your delivery area and add your staff.",
  },
  approved: {
    Icon: RiCheckboxCircleLine,
    tone: "bg-brand-soft/70 border-teal-200",
    iconTone: "text-brand-ink",
    title: "Approved",
    text: "Patients in your delivery area can see your listed products and order them. New orders appear under Orders.",
  },
  rejected: {
    Icon: RiErrorWarningLine,
    tone: "bg-orange-50 border-orange-200",
    iconTone: "text-orange-600",
    title: "Not approved",
    text: "Your application wasn't approved. Contact the clinic if you think this is a mistake.",
  },
  suspended: {
    Icon: RiForbidLine,
    tone: "bg-rose-50 border-rose-200",
    iconTone: "text-rose-600",
    title: "Suspended",
    text: "Patients can't see or order from you until the clinic lifts the suspension.",
  },
} as const;

/** The pharmacy's home: where it stands with the clinic, and its delivery setup. */
export default function PharmacyHome() {
  const { staff, pharmacy } = usePharmacy();
  if (!staff || !pharmacy) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  const s = STATUS[pharmacy.status];
  const owner = staff.role === "owner";

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          eyebrow={pharmacy.operatedByClinic ? "The clinic's pharmacy" : "Your pharmacy"}
          title={pharmacy.name}
          subtitle={
            <>
              Hi {staff.name.split(" ")[0]}, you&apos;re signed in as <strong className="text-ink">{staff.role}</strong>.
            </>
          }
        />

        <section className={`flex gap-4 rounded-[22px] border-[1.5px] p-5 sm:p-6 ${s.tone}`}>
          <s.Icon size={26} className={`shrink-0 ${s.iconTone}`} />
          <div>
            <p className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">{s.title}</p>
            <p className="text-[14px] text-ink-2 mt-0.5">{s.text}</p>
            {pharmacy.statusNote && pharmacy.status !== "approved" && (
              <p className="mt-3 text-[14px] text-ink-2 bg-white/80 rounded-xl px-3 py-2">
                <span className="font-bold text-ink">Reason from the clinic:</span> {pharmacy.statusNote}
              </p>
            )}
          </div>
        </section>

        <div className="grid sm:grid-cols-2 gap-4">
          <section className="surface rounded-[22px] p-5 sm:p-6">
            <p className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
              <span className="w-8 h-8 rounded-[10px] grid place-items-center border border-teal-100 bg-brand-soft text-brand-ink">
                <RiTruckLine size={17} />
              </span>
              Delivery
            </p>
            <p className="text-[24px] font-extrabold tracking-[-0.02em] text-ink mt-3">
              Up to <span className="num">{pharmacy.deliveryRadiusKm}</span> km
            </p>
            <p className="text-[14px] text-ink-2">
              Delivery fee: <span className="num">{money(pharmacy.deliveryFeeCents)}</span>
            </p>
            <p className={`mt-3 flex items-start gap-1.5 text-[13px] ${pharmacy.located ? "text-ink-3" : "text-orange-700 font-bold"}`}>
              <RiMapPin2Line size={15} className="shrink-0 mt-0.5" />
              {pharmacy.located
                ? [pharmacy.address.line1, pharmacy.address.line2].filter(Boolean).join(", ")
                : "We couldn't find your address on the map, so patients can't be matched to you. Add the area and city."}
            </p>
            {owner && (
              <Link to="/pharmacy-settings" className="inline-flex items-center mt-4 text-[13px] font-bold text-brand-ink hover:underline">
                Change delivery settings <RiArrowRightSLine size={16} />
              </Link>
            )}
          </section>

          <section className="surface rounded-[22px] p-5 sm:p-6">
            <p className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
              <span className="w-8 h-8 rounded-[10px] grid place-items-center border border-teal-100 bg-brand-soft text-brand-ink">
                <RiTeamLine size={17} />
              </span>
              Your role
            </p>
            <div className="mt-3 capitalize">
              <Pill tone="brand">{staff.role}</Pill>
            </div>
            <p className="text-[14px] text-ink-2 mt-2">
              {staff.role === "owner"
                ? "You manage staff, delivery settings, earnings and withdrawals."
                : staff.role === "pharmacist"
                  ? "You'll approve orders for prescription-only medicines."
                  : "You'll manage products and stock, pack orders and update deliveries."}
            </p>
            {owner && (
              <Link to="/pharmacy-staff" className="inline-flex items-center mt-4 text-[13px] font-bold text-brand-ink hover:underline">
                Manage staff <RiArrowRightSLine size={16} />
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
