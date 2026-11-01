"use client";

import { RiDirectionLine, RiLoader4Line, RiMapPin2Line, RiNavigationLine, RiRefreshLine } from "@remixicon/react";
import { useContext } from "react";
import { AppContext } from "@/Context/AppContext";
import { formatDistance, formatDuration, lastKnownOrigin, MODE_LABEL, useClinicDistance } from "@/hooks/useClinicDistance";
import { directionsUrl, useUserSettings } from "@/hooks/useUserSettings";
import type { AppContextType, ClinicDistance, TravelMode } from "@/types";

export const clinicAddress = (address?: { line1?: string; line2?: string } | null) =>
  [address?.line1, address?.line2].filter(Boolean).join(", ");

// Google's keyless "dirflg" values for the embedded route
const DIRFLG: Record<TravelMode, string> = { driving: "", transit: "r", walking: "w", bicycling: "b" };
const MODES: { id: TravelMode; label: string }[] = [
  { id: "driving", label: "Car" },
  { id: "transit", label: "Transit" },
  { id: "walking", label: "Walk" },
  { id: "bicycling", label: "Bike" },
];

/** "12.4 km · 28 min by car (with traffic)" */
export function distanceSentence(d: ClinicDistance) {
  if (d.kind === "straight-line" || d.durationSeconds == null) {
    return `About ${formatDistance(d.distanceMeters)} away (straight line)`;
  }
  return `${formatDistance(d.distanceMeters)} · ${formatDuration(d.durationSeconds)} ${MODE_LABEL[d.mode]}${d.traffic ? " (with traffic)" : ""}`;
}

/**
 * The clinic on a Google map, how far it is from the patient (their location or home
 * address), and directions. The map embed and directions links need no API key; the
 * distance comes from our server (Google Routes with a key, straight-line without).
 */
export default function ClinicMap({
  docId,
  address,
  name,
}: {
  docId?: string;
  address?: { line1?: string; line2?: string } | null;
  name?: string;
}) {
  const { token } = useContext(AppContext) as AppContextType;
  const settings = useUserSettings(!!token);
  const where = clinicAddress(address);
  const { result, status, error, measure } = useClinicDistance(token ? docId : undefined);
  if (!where || (settings && !settings.maps.enabled)) return null;

  // once we know where they are (and it's their live location), show the route instead of a pin
  const fromHere = result?.from === "current" && result.kind === "route";
  const mapSrc =
    result && fromHere
      ? `https://www.google.com/maps?saddr=${lastOrigin()}&daddr=${result.clinic.lat},${result.clinic.lng}&dirflg=${DIRFLG[result.mode]}&output=embed`
      : `https://www.google.com/maps?q=${encodeURIComponent(where)}&output=embed`;

  return (
    <div className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
      <iframe
        key={mapSrc}
        title={`Map of ${name ?? "the clinic"}`}
        src={mapSrc}
        className="w-full h-56 md:h-72 border-0 block"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="p-4 md:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <RiMapPin2Line size={18} className="text-teal-600 shrink-0 mt-0.5" />
            <span>
              <span className="font-bold text-slate-900">Clinic</span> · {where}
            </span>
          </p>
          <a
            href={directionsUrl(where, settings, result?.from === "current" ? lastOrigin() : undefined)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-bold hover:bg-teal-600 shrink-0"
          >
            <RiDirectionLine size={16} /> Directions
          </a>
        </div>

        {/* distance */}
        {token && docId && (
          <div className="rounded-2xl bg-teal-50/60 border border-teal-100 px-4 py-3">
            {status === "done" && result ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black text-slate-900">{distanceSentence(result)}</p>
                  <p className="text-[12px] text-slate-500">
                    From {result.from === "home" ? "your home address" : "where you are now"}
                    {result.kind === "straight-line" ? " · travel time needs the clinic's Google Maps set-up" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => measure(m.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        result.mode === m.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                  <button onClick={() => measure()} className="p-1.5 rounded-lg text-slate-400 hover:bg-white" aria-label="Measure again">
                    <RiRefreshLine size={16} />
                  </button>
                </div>
              </div>
            ) : status === "locating" || status === "loading" ? (
              <p className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <RiLoader4Line size={16} className="animate-spin text-teal-600" />
                {status === "locating" ? "Finding where you are…" : "Working out the distance…"}
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  {error ?? "See how far this clinic is from you and how long it takes to get there."}
                </p>
                <button
                  onClick={() => measure()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-[12px] font-bold hover:bg-teal-700 shrink-0"
                >
                  <RiNavigationLine size={15} /> How far is it?
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const lastOrigin = () => lastKnownOrigin() ?? "";

/** Small "Directions" button for an appointment card, with the distance when we know it. */
export function DirectionsButton({
  docId,
  address,
  className = "",
}: {
  docId?: string;
  address?: { line1?: string; line2?: string } | null;
  className?: string;
}) {
  const settings = useUserSettings();
  const where = clinicAddress(address);
  // only measures by itself when it won't trigger a location prompt
  const { result } = useClinicDistance(docId);
  if (!where || (settings && !settings.maps.enabled)) return null;
  return (
    <a
      href={directionsUrl(where, settings)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={result ? distanceSentence(result) : "Directions to the clinic"}
      className={`inline-flex items-center justify-center gap-1.5 border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700 font-bold px-4 py-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs transition-colors ${className}`}
    >
      <RiDirectionLine size={15} />
      {result ? (
        <span className="normal-case">
          {formatDistance(result.distanceMeters)}
          {result.durationSeconds != null ? ` · ${formatDuration(result.durationSeconds)}` : ""}
        </span>
      ) : (
        <span className="uppercase">Directions</span>
      )}
    </a>
  );
}
