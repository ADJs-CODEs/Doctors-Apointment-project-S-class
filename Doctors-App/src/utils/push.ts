import { API_PATHS } from "./apiPath";
import axiosInstance from "./axiosInstance";

// Device notifications (Web Push). The browser asks the user once; if they allow it, we
// subscribe this browser and send the subscription to the backend, which then pushes
// dose reminders, messages and alerts even when the site is closed.

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInstalled = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Where this browser stands. */
export async function pushState(): Promise<PushState> {
  // iPhone/iPad only allow push for web apps added to the Home Screen
  if (isIos() && !isInstalled()) return "needs-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const sub = await registration?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

const urlBase64ToUint8Array = (base64: string) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Asks for permission (must be called from a click) and turns device notifications on. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const { data } = await axiosInstance.get(API_PATHS.PUSH.KEY, { silent: true } as any);
  if (!data.success || !data.publicKey) throw new Error("Device notifications aren't set up on the server yet");

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    }));

  await axiosInstance.post(API_PATHS.PUSH.SUBSCRIBE, { subscription: subscription.toJSON() }, { silent: true } as any);
  return "on";
}

/** Turns them off for this browser (also used on logout, so the next person doesn't get them). */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await axiosInstance.post(API_PATHS.PUSH.UNSUBSCRIBE, { endpoint: subscription.endpoint }, { silent: true } as any);
  } catch {
    // still unsubscribe locally
  }
  await subscription.unsubscribe();
}

/**
 * Re-sends an existing subscription after login, so this device follows whoever is
 * logged in now. Does nothing (and never prompts) if notifications aren't on.
 */
export async function syncPush(): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await axiosInstance
      .post(API_PATHS.PUSH.SUBSCRIBE, { subscription: subscription.toJSON() }, { silent: true } as any)
      .catch(() => {});
  }
}
