// Service worker: shows device notifications sent by the backend (Web Push) and opens
// the right page when one is tapped. It runs in the background, even with the site closed.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "ADJ's CODEs", body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "ADJ's CODEs", {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag, // same tag replaces the older one (e.g. several messages from one doctor)
      renotify: !!data.tag,
      requireInteraction: !!data.urgent, // urgent ones stay until dismissed
      data: { url: data.url || '/dashboard' },
      vibrate: data.urgent ? [200, 100, 200, 100, 200] : [100],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href;

  event.waitUntil(
    (async () => {
      // reuse an open tab of the app if there is one, otherwise open a new one
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const tab = tabs.find((t) => new URL(t.url).origin === self.location.origin);
      if (tab) {
        await tab.focus();
        return tab.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
