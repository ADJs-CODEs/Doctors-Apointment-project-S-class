"use client";

import { useGoogleLogin } from "@react-oauth/google";
import {
  RiAlarmLine,
  RiCalendarCheckLine,
  RiCheckLine,
  RiDeleteBin6Line,
  RiErrorWarningLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLoader4Line,
  RiLock2Line,
  RiLockPasswordLine,
  RiMapPin2Line,
  RiMoonLine,
  RiNotification3Line,
  RiPlugLine,
  RiRefreshLine,
  RiShieldUserLine,
  RiUserLine,
  RiUserSmileLine,
} from "@remixicon/react";
import { type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeviceNotificationsSwitch } from "@/components/patient/DeviceNotifications";
import { AppContext } from "@/Context/AppContext";
import { directionsUrl, setCachedSettings } from "@/hooks/useUserSettings";
import type { AppContextType, GoogleCalendarStatus, NotificationCategory, TravelMode, UserSettings } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { disablePush } from "@/utils/push";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const CATEGORY_INFO: Record<NotificationCategory, { label: string; hint: string }> = {
  medication: { label: "Medication reminders", hint: "Before each dose is due" },
  missedDose: { label: "Missed doses", hint: "When a dose wasn't logged" },
  appointments: { label: "Appointments", hint: "Booked, reminders, cancelled, missed" },
  messages: { label: "Doctor messages", hint: "Urgent messages always come through" },
  payments: { label: "Payments & receipts", hint: "Receipts are always emailed" },
  careCircle: { label: "Care circle", hint: "Requests, and updates about people you watch" },
  gifts: { label: "Wish Well gifts", hint: "When someone sends you a gift" },
  security: { label: "Sign-in alerts", hint: "When your account is signed in to" },
};

const SECTIONS = [
  { id: "notifications", label: "Notifications", icon: RiNotification3Line },
  { id: "reminders", label: "Reminders", icon: RiAlarmLine },
  { id: "privacy", label: "Privacy", icon: RiUserSmileLine },
  { id: "apps", label: "Connected apps", icon: RiPlugLine },
  { id: "security", label: "Security", icon: RiShieldUserLine },
  { id: "account", label: "Account", icon: RiUserLine },
] as const;

// --- small building blocks ---

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${on ? "bg-teal-500" : "bg-slate-300"}`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Section({ id, title, hint, icon, children }: { id: string; title: string; hint: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 sm:p-7">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-t border-slate-100 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        {hint && <p className="text-[12px] text-slate-400">{hint}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">{children}</div>
    </div>
  );
}

// --- the page ---

export default function AccountSettings() {
  const { setToken } = useContext(AppContext) as AppContextType;
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [locked, setLocked] = useState<NotificationCategory[]>([]);
  const [calendar, setCalendar] = useState<GoogleCalendarStatus | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.SETTINGS.GET);
      if (data.success) {
        setSettings(data.settings);
        setLocked(data.lockedEmail);
        setCalendar(data.googleCalendar);
      }
    } catch {
      toast.error("Couldn't load your settings");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // every change saves itself shortly after, like a phone's settings app
  const update = (change: (s: UserSettings) => UserSettings) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = change(structuredClone(prev));
      clearTimeout(saveTimer.current);
      setSaveState("saving");
      saveTimer.current = setTimeout(async () => {
        try {
          const { data } = await axiosInstance.put(API_PATHS.SETTINGS.SAVE, { settings: next }, { silent: true } as any);
          if (data.success) {
            setCachedSettings(data.settings);
            setSaveState("saved");
          } else {
            toast.error(data.message);
            setSaveState("idle");
          }
        } catch {
          toast.error("Couldn't save your settings");
          setSaveState("idle");
        }
      }, 600);
      return next;
    });
  };

  if (!settings) {
    return (
      <div className="max-w-5xl mx-auto py-6 space-y-4">
        {[24, 72, 40].map((h, i) => (
          <div key={i} className="animate-pulse rounded-[28px] bg-slate-200/60" style={{ height: h * 4 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Notifications, reminders, privacy, connected apps and your account.</p>
        </div>
        <span
          className={`flex items-center gap-1.5 text-[12px] font-bold transition-opacity ${
            saveState === "idle" ? "opacity-0" : "opacity-100"
          } ${saveState === "saved" ? "text-teal-600" : "text-slate-400"}`}
          aria-live="polite"
        >
          {saveState === "saving" ? <RiLoader4Line size={14} className="animate-spin" /> : <RiCheckLine size={14} />}
          {saveState === "saving" ? "Saving…" : "Saved"}
        </span>
      </div>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">
        {/* section nav: a sticky list on desktop, scrolling pills on phones */}
        <nav className="mb-5 lg:mb-0">
          <div className="lg:sticky lg:top-24 flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-2.5 shrink-0 px-3.5 py-2.5 rounded-2xl text-[13px] font-bold text-slate-500 bg-white lg:bg-transparent border border-slate-200 lg:border-0 hover:bg-white hover:text-slate-900 transition-colors"
              >
                <Icon size={17} /> {label}
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-6">
          {/* notifications */}
          <Section
            id="notifications"
            title="Notifications"
            hint="Choose what reaches you by email and on your devices. Everything still shows in the bell."
            icon={<RiNotification3Line size={20} />}
          >
            <div className="rounded-2xl border border-slate-200 overflow-hidden mb-5">
              <DeviceNotificationsSwitch />
            </div>

            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 sm:gap-x-8 text-[11px] font-black uppercase tracking-wider text-slate-400 pb-2">
              <span>What</span>
              <span className="w-11 text-center">Email</span>
              <span className="w-11 text-center">Device</span>
            </div>
            {(Object.keys(CATEGORY_INFO) as NotificationCategory[]).map((c) => {
              const lockedEmail = locked.includes(c);
              return (
                <div key={c} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 sm:gap-x-8 py-3 border-t border-slate-100">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{CATEGORY_INFO[c].label}</p>
                    <p className="text-[12px] text-slate-400">{CATEGORY_INFO[c].hint}</p>
                  </div>
                  <span className="relative" title={lockedEmail ? "Receipts are always emailed" : undefined}>
                    <Toggle
                      label={`${CATEGORY_INFO[c].label} by email`}
                      on={settings.notifications[c].email}
                      disabled={lockedEmail}
                      onChange={(v) => update((s) => ((s.notifications[c].email = v), s))}
                    />
                    {lockedEmail && <RiLock2Line size={11} className="absolute -top-1 -right-1 text-slate-400" />}
                  </span>
                  <Toggle
                    label={`${CATEGORY_INFO[c].label} on this device`}
                    on={settings.notifications[c].push}
                    onChange={(v) => update((s) => ((s.notifications[c].push = v), s))}
                  />
                </div>
              );
            })}

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <Row title="Quiet hours" hint="No device notifications at night. Urgent alerts still come through.">
                <Toggle
                  label="Quiet hours"
                  on={settings.quietHours.enabled}
                  onChange={(v) => update((s) => ((s.quietHours.enabled = v), s))}
                />
              </Row>
              {settings.quietHours.enabled && (
                <div className="flex items-center gap-3 pt-2 text-sm">
                  <RiMoonLine size={16} className="text-slate-400" />
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => update((s) => ((s.quietHours.start = e.target.value), s))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => update((s) => ((s.quietHours.end = e.target.value), s))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  />
                </div>
              )}
            </div>
          </Section>

          {/* reminders */}
          <Section id="reminders" title="Reminders" hint="When we remind you about doses and visits." icon={<RiAlarmLine size={20} />}>
            <Row title="Remind me before each dose" hint="The reminder and the orange 'due soon' alert">
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                {([15, 30, 60] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => update((s) => ((s.reminders.doseMinutesBefore = m), s))}
                    className={`px-3 py-2 text-[12px] font-bold transition-colors ${
                      settings.reminders.doseMinutesBefore === m ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {m === 60 ? "1 hour" : `${m} min`}
                  </button>
                ))}
              </div>
            </Row>
            <Row title="Remind me the day before an appointment" hint="On top of the reminders an hour before and at the start">
              <Toggle
                label="Day-before appointment reminder"
                on={settings.reminders.appointmentDayBefore}
                onChange={(v) => update((s) => ((s.reminders.appointmentDayBefore = v), s))}
              />
            </Row>
          </Section>

          {/* privacy */}
          <Section id="privacy" title="Privacy" hint="How you appear to others." icon={<RiUserSmileLine size={20} />}>
            <Row title="Send Wish Well gifts anonymously" hint={'Your gifts show as "Someone" unless you change it when sending'}>
              <Toggle
                label="Gift anonymously by default"
                on={settings.privacy.giftAnonymously}
                onChange={(v) => update((s) => ((s.privacy.giftAnonymously = v), s))}
              />
            </Row>
            <WishWellOptOut />
          </Section>

          {/* connected apps */}
          <Section id="apps" title="Connected apps" hint="Bring your appointments into the apps you already use." icon={<RiPlugLine size={20} />}>
            <GoogleCalendarCard status={calendar} settings={settings} update={update} onChanged={load} />
            <GoogleMapsCard settings={settings} update={update} />
          </Section>

          {/* security */}
          <Section id="security" title="Security" hint="Your password and sign-in alerts." icon={<RiShieldUserLine size={20} />}>
            <ChangePassword />
          </Section>

          {/* account */}
          <Section id="account" title="Account" hint="Leaving for good." icon={<RiUserLine size={20} />}>
            <DeleteAccount setToken={setToken} />
          </Section>
        </div>
      </div>
    </div>
  );
}

// --- connected apps ---

function GoogleCalendarCard({
  status,
  settings,
  update,
  onChanged,
}: {
  status: GoogleCalendarStatus | null;
  settings: UserSettings;
  update: (fn: (s: UserSettings) => UserSettings) => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);

  const connect = useGoogleLogin({
    flow: "auth-code",
    scope: CALENDAR_SCOPE,
    onSuccess: async ({ code }) => {
      setBusy("connect");
      try {
        const { data } = await axiosInstance.post(API_PATHS.SETTINGS.GCAL_CONNECT, { code });
        if (data.success) {
          toast.success(data.added ? `${data.message}. Added ${data.added} upcoming appointment${data.added === 1 ? "" : "s"}.` : data.message);
          onChanged();
        } else {
          toast.error(data.message);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Couldn't connect Google Calendar");
      } finally {
        setBusy(null);
      }
    },
    onError: () => toast.error("Google sign-in was cancelled"),
  });

  const call = async (kind: "sync" | "disconnect") => {
    setBusy(kind);
    try {
      const { data } = await axiosInstance.post(kind === "sync" ? API_PATHS.SETTINGS.GCAL_SYNC : API_PATHS.SETTINGS.GCAL_DISCONNECT);
      if (data.success) {
        toast.success(data.message);
        onChanged();
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <RiCalendarCheckLine size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-slate-900">Google Calendar</p>
            {status?.connected && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 rounded-full px-2 py-0.5">Connected</span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {status?.connected
              ? `Appointments go into ${status.email ?? "your calendar"} automatically and are removed if cancelled.`
              : "Add your appointments to your calendar automatically, with a reminder an hour before."}
          </p>
          {status?.lastError && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-red-600">
              <RiErrorWarningLine size={14} /> {status.lastError}
            </p>
          )}
          {!status?.configured && (
            <p className="mt-2 text-[12px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              Not available yet: the clinic still needs to finish the Google set-up.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        {status?.connected ? (
          <>
            <button
              onClick={() => call("sync")}
              disabled={!!busy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-bold hover:bg-teal-600 disabled:opacity-60"
            >
              <RiRefreshLine size={15} className={busy === "sync" ? "animate-spin" : ""} /> Sync now
            </button>
            <button
              onClick={() => call("disconnect")}
              disabled={!!busy}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-60"
            >
              {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
            </button>
            <label className="ml-auto flex items-center gap-2 text-[12px] font-bold text-slate-600">
              Add new bookings
              <Toggle label="Add new bookings automatically" on={settings.calendar.autoAdd} onChange={(v) => update((s) => ((s.calendar.autoAdd = v), s))} />
            </label>
          </>
        ) : (
          <button
            onClick={() => connect()}
            disabled={!status?.configured || !!busy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-[13px] font-bold hover:bg-slate-50 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            {busy === "connect" ? "Connecting…" : "Connect Google Calendar"}
          </button>
        )}
      </div>
    </div>
  );
}

function GoogleMapsCard({ settings, update }: { settings: UserSettings; update: (fn: (s: UserSettings) => UserSettings) => void }) {
  const [address, setAddress] = useState(settings.maps.homeAddress);
  const modes: { id: TravelMode; label: string }[] = [
    { id: "driving", label: "Drive" },
    { id: "transit", label: "Transit" },
    { id: "walking", label: "Walk" },
    { id: "bicycling", label: "Cycle" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <RiMapPin2Line size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-slate-900">Google Maps</p>
            <Toggle label="Show maps and directions" on={settings.maps.enabled} onChange={(v) => update((s) => ((s.maps.enabled = v), s))} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            See where each clinic is, how far it is from you, how long it takes to get there, and directions.
          </p>
        </div>
      </div>

      {settings.maps.enabled && (
        <div className="mt-4 space-y-3">
          <div>
            <span className="text-[12px] font-bold text-slate-600">Measure distance and directions from</span>
            <div className="grid sm:grid-cols-2 gap-2 mt-1">
              {(
                [
                  { id: "current", title: "Where I am", hint: "Uses your device's location when you ask; never stored" },
                  { id: "home", title: "My home address", hint: "Works without sharing your location" },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  onClick={() => update((s) => ((s.maps.origin = o.id), s))}
                  className={`text-left rounded-2xl border px-4 py-3 transition-colors ${
                    settings.maps.origin === o.id ? "border-teal-400 bg-teal-50/60 ring-2 ring-teal-100" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">{o.title}</p>
                  <p className="text-[11px] text-slate-500">{o.hint}</p>
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-[12px] font-bold text-slate-600">
              Home address{settings.maps.origin === "home" ? "" : " (optional)"}
            </span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => address !== settings.maps.homeAddress && update((s) => ((s.maps.homeAddress = address.trim()), s))}
              maxLength={200}
              placeholder="e.g. 12 Admiralty Way, Lekki, Lagos"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
            <span className="text-[11px] text-slate-400">
              Only used to work out distances and directions; never shown to doctors.
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-slate-600 mr-1">I usually</span>
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => update((s) => ((s.maps.travelMode = m.id), s))}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-colors ${
                  settings.maps.travelMode === m.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {m.label}
              </button>
            ))}
            <a
              href={directionsUrl("Lagos University Teaching Hospital", settings)}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-[12px] font-bold text-teal-600 hover:underline"
            >
              Try it →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// --- privacy ---

function WishWellOptOut() {
  const [confirming, setConfirming] = useState(false);
  const optOut = async () => {
    try {
      await axiosInstance.post(API_PATHS.WISH_WELL.OPT_OUT);
      toast.success("You've left the Wish Well");
      setConfirming(false);
    } catch {
      toast.error("Couldn't update the Wish Well");
    }
  };
  return (
    <Row title="Wish Well" hint="Remove yourself from the Wish Well (if your doctor featured you)">
      {confirming ? (
        <>
          <button onClick={() => setConfirming(false)} className="text-[12px] font-bold text-slate-500 px-2">
            Keep me
          </button>
          <button onClick={optOut} className="px-3 py-2 rounded-xl bg-red-600 text-white text-[12px] font-bold hover:bg-red-700">
            Yes, remove me
          </button>
        </>
      ) : (
        <button onClick={() => setConfirming(true)} className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50">
          Leave the Wish Well
        </button>
      )}
    </Row>
  );
}

// --- security ---

function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error("New password must be at least 8 characters");
    setLoading(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.HANDLE_CHANGE_PASSWORD, { oldPassword, newPassword });
      if (data.success) {
        toast.success(data.message);
        setOldPassword("");
        setNewPassword("");
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const strength = newPassword.length < 8 ? "Too short" : newPassword.length < 10 ? "Fair" : newPassword.length < 12 ? "Good" : "Strong";
  const field =
    "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <form onSubmit={submit} className="space-y-3 max-w-md">
      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <RiLockPasswordLine size={16} className="text-teal-600" /> Change password
      </p>
      {[
        { value: oldPassword, set: setOldPassword, placeholder: "Current password" },
        { value: newPassword, set: setNewPassword, placeholder: "New password (at least 8 characters)" },
      ].map((f) => (
        <div key={f.placeholder} className="relative">
          <input
            type={show ? "text" : "password"}
            placeholder={f.placeholder}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            required
            className={field}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={show ? "Hide passwords" : "Show passwords"}
          >
            {show ? <RiEyeOffLine size={17} /> : <RiEyeLine size={17} />}
          </button>
        </div>
      ))}
      {newPassword && (
        <p className={`text-[12px] font-bold ${strength === "Too short" ? "text-red-500" : strength === "Fair" ? "text-amber-600" : "text-teal-600"}`}>
          {strength}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-teal-600 disabled:opacity-60"
      >
        {loading && <RiLoader4Line size={16} className="animate-spin" />}
        {loading ? "Updating…" : "Update password"}
      </button>
      <p className="text-[12px] text-slate-400">Sign-in alert emails can be switched in Notifications above.</p>
    </form>
  );
}

// --- account ---

function DeleteAccount({ setToken }: { setToken: (t: string) => void }) {
  const [phrase, setPhrase] = useState("");
  const remove = async () => {
    if (phrase !== "DELETE") return toast.error("Type DELETE to confirm");
    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.HANDLE_DELETE_ACCOUNT, {});
      if (data.success) {
        await disablePush().catch(() => {});
        setToken("");
        localStorage.removeItem("token");
        toast.success("Account deleted");
      }
    } catch {
      toast.error("Could not delete account");
    }
  };
  return (
    <div className="rounded-2xl bg-red-50 border border-red-100 p-4 sm:p-5">
      <p className="font-black text-red-700 flex items-center gap-2">
        <RiErrorWarningLine size={18} /> Delete my account
      </p>
      <p className="text-sm text-slate-600 mt-1 max-w-md">
        This erases your medical history, prescriptions and appointments. It can&apos;t be undone.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="Type DELETE"
          className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-red-400"
        />
        <button
          onClick={remove}
          disabled={phrase !== "DELETE"}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RiDeleteBin6Line size={16} /> Delete account
        </button>
      </div>
    </div>
  );
}
