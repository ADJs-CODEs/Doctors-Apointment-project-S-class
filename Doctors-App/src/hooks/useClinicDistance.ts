"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUserSettings } from "@/hooks/useUserSettings";
import type { ClinicDistance, TravelMode } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

type Point = { lat: number; lng: number };
export type DistanceStatus = "idle" | "locating" | "loading" | "done" | "error";

// The last position the browser gave us, reused for a few minutes so a list of
// appointments doesn't ask for location once per card. Never sent anywhere but our API.
let lastPosition: { point: Point; at: number } | null = null;

function currentPosition(): Promise<Point> {
  if (lastPosition && Date.now() - lastPosition.at < 5 * 60_000) return Promise.resolve(lastPosition.point);
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Your browser can't share your location"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        lastPosition = { point, at: Date.now() };
        resolve(point);
      },
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location is blocked. Allow it in your browser, or add a home address in Settings."
              : "Couldn't get your location. Try again.",
          ),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  });
}

/** The last position measured from, as "lat,lng" (memory only), for directions links. */
export const lastKnownOrigin = () =>
  lastPosition ? `${lastPosition.point.lat.toFixed(5)},${lastPosition.point.lng.toFixed(5)}` : null;

/** Has the patient already allowed location for this site? (so we can measure without asking) */
async function locationAllowed() {
  try {
    const p = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return p?.state === "granted";
  } catch {
    return false;
  }
}

/**
 * Distance and travel time from the patient to a doctor's clinic.
 * - origin "home" (Settings): measured from their home address, automatically
 * - origin "current": automatic if they've allowed location before, otherwise on `measure()`
 *   (which asks the browser), so nobody gets a location prompt they didn't ask for
 */
export function useClinicDistance(docId: string | undefined, { auto = true } = {}) {
  const settings = useUserSettings();
  const [result, setResult] = useState<ClinicDistance | null>(null);
  const [status, setStatus] = useState<DistanceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  const ask = useCallback(
    async (useLocation: boolean, mode?: TravelMode) => {
      if (!docId) return;
      setError(null);
      try {
        let origin: Point | undefined;
        if (useLocation) {
          setStatus("locating");
          origin = await currentPosition();
        }
        setStatus("loading");
        const { data } = await axiosInstance.post(
          API_PATHS.MAPS.DISTANCE,
          { docId, origin, mode },
          { silent: true } as any,
        );
        if (!data.success) throw new Error(data.message);
        setResult(data);
        setStatus("done");
      } catch (err: any) {
        setError(err.response?.data?.message || err.message);
        setStatus("error");
      }
    },
    [docId],
  );

  // measure without being asked only when it won't pop a permission prompt
  useEffect(() => {
    if (!auto || !settings || !settings.maps.enabled || tried.current || !docId) return;
    tried.current = true;
    if (settings.maps.origin === "home" && settings.maps.homeAddress) {
      ask(false);
    } else {
      locationAllowed().then((ok) => {
        if (ok) ask(true);
      });
    }
  }, [auto, settings, docId, ask]);

  const measure = useCallback(
    (mode?: TravelMode) =>
      ask(!(settings?.maps.origin === "home" && settings.maps.homeAddress), mode ?? result?.mode),
    [ask, settings, result],
  );

  return { result, status, error, measure, settings };
}

// --- formatting ---

export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`);

export const formatDuration = (s: number) => {
  const mins = Math.max(1, Math.round(s / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return mins % 60 ? `${h} h ${mins % 60} min` : `${h} h`;
};

export const MODE_LABEL: Record<TravelMode, string> = {
  driving: "by car",
  transit: "by public transport",
  walking: "on foot",
  bicycling: "by bike",
};
