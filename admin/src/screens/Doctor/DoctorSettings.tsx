"use client";

import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import {
  RiCalendarCheckLine,
  RiExternalLinkLine,
  RiLockPasswordLine,
  RiMailLine,
  RiMapPin2Line,
  RiMoonLine,
  RiRefreshLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Pill, Skeleton } from "../../components/panel";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";
import DoctorSchedule from "./DoctorSchedule";

// Public OAuth client id (not a secret), the same one the patient site uses
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "703083582094-kl10rok1pn4cev8mcq6thlr67scdevmu.apps.googleusercontent.com";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

type EmailKind = "bookings" | "cancellations" | "visitStarting";
type Settings = { emails: Record<EmailKind, boolean>; quietHours: { enabled: boolean; start: string; end: string } };
type Data = {
  available: boolean;
  email: string;
  settings: Settings;
  calendar: { configured: boolean; connected: boolean; email?: string; lastError?: string };
  map: { address: string; located: boolean; lat?: number; lng?: number; precise: boolean };
};

const EMAILS: { key: EmailKind; label: string; hint: string }[] = [
  { key: "bookings", label: "New bookings and payments", hint: "When a patient books and pays for a visit" },
  { key: "cancellations", label: "Cancellations and missed visits", hint: "When a visit is cancelled or recorded as missed" },
  { key: "visitStarting", label: "Visit starting now", hint: "At the time of each appointment, with the video link" },
];

const input = "rounded-[14px] border-[1.5px] border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus:border-brand";
const ghost = "flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line bg-white text-[14px] font-bold text-ink-2 hover:bg-canvas disabled:opacity-50";

/** The doctor's settings: bookings switch, hours and fees, emails, quiet hours, password, connected apps. */
export default function DoctorSettings() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <SettingsPage />
    </GoogleOAuthProvider>
  );
}

function SettingsPage() {
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.DOCTOR.SETTINGS);
      if (data.success) setData(data);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load your settings");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // saves straight away, like a light switch
  const save = async (patch: { available?: boolean; settings?: Settings }) => {
    if (!data) return;
    const before = data;
    setData({ ...data, ...patch });
    try {
      const { data: res } = await axiosInstance.put(API_PATHS.DOCTOR.SETTINGS, patch, { silent: true } as any);
      if (!res.success) throw new Error(res.message);
      setData((d) => (d ? { ...d, available: res.available, settings: res.settings } : d));
    } catch (err: any) {
      setData(before);
      toast.error(err.response?.data?.message || err.message || "Couldn't save");
    }
  };

  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const s = data.settings;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader eyebrow="Your practice" title="Settings" subtitle="Changes save as you make them." />

        {/* the big one first: can patients book right now? */}
        <section
          className={`rounded-[22px] border-[1.5px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${
            data.available ? "border-teal-200 bg-brand-soft/70" : "border-rose-200 bg-rose-50/60"
          }`}
        >
          <div className="flex-1">
            <p className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">{data.available ? "You're taking bookings" : "You're not taking bookings"}</p>
            <p className="text-[14px] text-ink-2">
              {data.available
                ? "Patients can book you inside your hours below."
                : "Patients see you as not taking bookings and can't book. Visits already booked stay as they are."}
            </p>
          </div>
          <Toggle on={data.available} onChange={(v) => save({ available: v })} label="Taking bookings" />
        </section>

        <DoctorSchedule />

        <Card icon={<RiMailLine size={18} />} title="Emails" hint="Everything still shows in your notification bell.">
          <ul className="divide-y divide-line">
            {EMAILS.map((e) => (
              <li key={e.key} className="flex items-center gap-4 py-3">
                <div className="flex-1">
                  <p className="font-bold text-ink text-[15px]">{e.label}</p>
                  <p className="text-[13px] text-ink-3">{e.hint}</p>
                </div>
                <Toggle on={s.emails[e.key]} onChange={(v) => save({ settings: { ...s, emails: { ...s.emails, [e.key]: v } } })} label={e.label} />
              </li>
            ))}
            <li className="flex items-center gap-4 py-3">
              <div className="flex-1">
                <p className="font-bold text-ink text-[15px] flex items-center gap-1.5">
                  <RiShieldCheckLine size={15} className="text-brand-ink" /> Patient safety alerts
                </p>
                <p className="text-[13px] text-ink-3">A patient took a dose early, or a visit needs closing. Always sent.</p>
              </div>
              <Pill tone="brand">Always on</Pill>
            </li>
          </ul>
        </Card>

        <Card icon={<RiMoonLine size={18} />} title="Quiet hours" hint="No non-urgent emails during these hours. Safety alerts still come through.">
          <div className="flex flex-wrap items-center gap-3">
            <Toggle on={s.quietHours.enabled} onChange={(v) => save({ settings: { ...s, quietHours: { ...s.quietHours, enabled: v } } })} label="Quiet hours" />
            <span className="text-[14px] text-ink-2">From</span>
            <input
              type="time"
              value={s.quietHours.start}
              disabled={!s.quietHours.enabled}
              onChange={(e) => save({ settings: { ...s, quietHours: { ...s.quietHours, start: e.target.value } } })}
              className={`${input} disabled:opacity-40`}
            />
            <span className="text-[14px] text-ink-2">to</span>
            <input
              type="time"
              value={s.quietHours.end}
              disabled={!s.quietHours.enabled}
              onChange={(e) => save({ settings: { ...s, quietHours: { ...s.quietHours, end: e.target.value } } })}
              className={`${input} disabled:opacity-40`}
            />
          </div>
        </Card>

        <Card icon={<RiCalendarCheckLine size={18} />} title="Google Calendar" hint="Your booked visits appear in your own calendar, and disappear if they're cancelled.">
          <CalendarConnect calendar={data.calendar} onChanged={load} />
        </Card>

        <Card icon={<RiMapPin2Line size={18} />} title="Google Maps" hint="Where patients see your clinic, and get directions and travel time to.">
          <MapCheck map={data.map} onChanged={(map) => setData({ ...data, map })} />
        </Card>

        <Card icon={<RiLockPasswordLine size={18} />} title="Password" hint={`You log in with ${data.email}.`}>
          <PasswordForm />
        </Card>
      </div>
    </div>
  );
}

function Card({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="surface rounded-[22px] p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-9 h-9 shrink-0 rounded-[11px] grid place-items-center border border-teal-100 bg-brand-soft text-brand-ink">{icon}</span>
        <div>
          <h2 className="text-[16px] font-bold text-ink">{title}</h2>
          <p className="text-[13px] text-ink-3">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative w-14 h-8 rounded-full shrink-0 transition-colors ${on ? "bg-brand" : "bg-line"}`}
    >
      <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : ""}`} />
    </button>
  );
}

function CalendarConnect({ calendar, onChanged }: { calendar: Data["calendar"]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (key: string, url: string, body?: object) => {
    setBusy(key);
    try {
      const { data } = await axiosInstance.post(url, body ?? {});
      if (data.success) {
        toast.success(data.message);
        onChanged();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(null);
    }
  };

  const connect = useGoogleLogin({
    flow: "auth-code",
    scope: CALENDAR_SCOPE,
    onSuccess: ({ code }) => call("connect", API_PATHS.DOCTOR.GCAL_CONNECT, { code }),
    onError: () => toast.error("Google sign-in was cancelled"),
  });

  if (!calendar.configured) {
    return <p className="text-[14px] text-ink-3">Google Calendar isn&apos;t set up on the server yet (the clinic needs to add its Google client secret).</p>;
  }
  if (!calendar.connected) {
    return (
      <button onClick={() => connect()} disabled={busy !== null} className="btn btn-ink !rounded-xl disabled:opacity-50">
        {busy ? "Connecting…" : "Connect Google Calendar"}
      </button>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-[15px] text-ink-2">
        Connected to <strong className="text-ink">{calendar.email ?? "your Google account"}</strong>
      </p>
      {calendar.lastError && <p className="text-[13px] text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">{calendar.lastError}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => call("sync", API_PATHS.DOCTOR.GCAL_SYNC)} disabled={busy !== null} className={ghost}>
          <RiRefreshLine size={15} /> {busy === "sync" ? "Syncing…" : "Sync now"}
        </button>
        <button
          onClick={() => call("disconnect", API_PATHS.DOCTOR.GCAL_DISCONNECT)}
          disabled={busy !== null}
          className="px-4 py-2.5 rounded-xl text-[14px] font-bold text-ink-3 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function MapCheck({ map, onChanged }: { map: Data["map"]; onChanged: (m: Data["map"]) => void }) {
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.DOCTOR.MAP_REFRESH);
      if (data.success) {
        onChanged(data.map);
        data.map.located ? toast.success(data.message) : toast.warning(data.message);
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!map.address) return <p className="text-[14px] text-ink-3">Add your clinic address in My Profile first.</p>;

  const q = map.located ? `${map.lat},${map.lng}` : encodeURIComponent(map.address);
  return (
    <div className="space-y-3">
      <p className="text-[15px] font-bold text-ink">{map.address}</p>
      {map.located ? (
        <div className="rounded-2xl overflow-hidden border border-line aspect-[16/7] bg-canvas">
          <iframe title="Your clinic on the map" src={`https://maps.google.com/maps?q=${q}&z=15&output=embed`} className="w-full h-full" loading="lazy" />
        </div>
      ) : (
        <p className="text-[13px] text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
          We couldn&apos;t place this address on the map yet, so patients don&apos;t get directions or travel time to you. Add the area and city in
          My Profile, then check again.
        </p>
      )}
      {map.located && !map.precise && (
        <p className="text-[13px] text-ink-3">This pin is approximate (from OpenStreetMap). It becomes exact once the clinic adds a Google Maps key.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={refresh} disabled={busy} className={ghost}>
          <RiRefreshLine size={15} /> {busy ? "Checking…" : "Check my location again"}
        </button>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${q}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[14px] font-bold text-brand-ink hover:bg-brand-soft"
        >
          <RiExternalLinkLine size={15} /> Open in Google Maps
        </a>
      </div>
    </div>
  );
}

/** Also the first-login screen for doctors the admin added (onDone reloads their profile). */
export function PasswordForm({ onDone, stacked }: { onDone?: () => void; stacked?: boolean }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", repeat: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.repeat) return toast.error("The new passwords don't match");
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.DOCTOR.CHANGE_PASSWORD, { currentPassword: form.currentPassword, newPassword: form.newPassword });
      if (data.success) {
        toast.success(data.message);
        setForm({ currentPassword: "", newPassword: "", repeat: "" });
        onDone?.();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={stacked ? "grid gap-3" : "grid sm:grid-cols-3 gap-3"}>
      <input required type="password" placeholder={stacked ? "Starting password from the email" : "Current password"} value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} className={input} />
      <input required type="password" minLength={8} placeholder="New password (8+)" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} className={input} />
      <input required type="password" minLength={8} placeholder="Repeat new password" value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })} className={input} />
      <button type="submit" disabled={saving} className={`${stacked ? "" : "sm:col-span-3 sm:justify-self-start"} justify-self-stretch btn btn-ink !rounded-xl disabled:opacity-50`}>
        {saving ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
