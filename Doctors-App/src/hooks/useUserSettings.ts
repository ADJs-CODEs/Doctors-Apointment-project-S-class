"use client";

import { useEffect, useState } from "react";
import type { UserSettings } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

// The logged-in user's settings, loaded once and shared by every component that asks
// (maps on doctor pages, directions on appointments, gift defaults...). The Settings
// page calls setCachedSettings after saving so everything updates.

let cached: UserSettings | null = null;
let loading: Promise<UserSettings | null> | null = null;
const listeners = new Set<(s: UserSettings | null) => void>();

function load() {
  loading ??= axiosInstance
    .get(API_PATHS.SETTINGS.GET, { silent: true } as any)
    .then(({ data }) => (data.success ? (data.settings as UserSettings) : null))
    .catch(() => null)
    .then((s) => {
      cached = s;
      listeners.forEach((fn) => fn(s));
      return s;
    });
  return loading;
}

export function setCachedSettings(s: UserSettings) {
  cached = s;
  listeners.forEach((fn) => fn(s));
}

/** Forget them (e.g. on logout) so the next person's settings are loaded fresh. */
export function clearCachedSettings() {
  cached = null;
  loading = null;
}

export function useUserSettings(enabled = true) {
  const [settings, setSettings] = useState<UserSettings | null>(cached);
  useEffect(() => {
    if (!enabled) return;
    listeners.add(setSettings);
    if (!cached) load();
    return () => {
      listeners.delete(setSettings);
    };
  }, [enabled]);
  return settings;
}

/**
 * Google Maps directions URL (no API key needed). Starts from `from` (e.g. "lat,lng" of
 * where they are), else their home address if they chose it, else Google uses the
 * device's own location.
 */
export function directionsUrl(destination: string, settings: UserSettings | null, from?: string) {
  const params = new URLSearchParams({ api: "1", destination });
  const origin = from || (settings?.maps.origin === "home" ? settings.maps.homeAddress : "");
  if (origin) params.set("origin", origin);
  if (settings?.maps.travelMode) params.set("travelmode", settings.maps.travelMode);
  return `https://www.google.com/maps/dir/?${params}`;
}
