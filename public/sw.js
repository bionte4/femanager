/* FE-Track simple service worker — cache app shell untuk offline */
const CACHE = "fetrack-v1";
const PRECACHE = ["/", "/engineer/my-tickets", "/login", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Jangan cache API / auth
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/api")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/engineer/my-tickets")))
  );
});

/** FCM / Web Push: tampilkan notifikasi saat app di background */
self.addEventListener("push", (event) => {
  let title = "FE-Track";
  let body = "Ada update ticket";
  let href = "/engineer/my-tickets";

  try {
    if (event.data) {
      const raw = event.data.json();
      const data = raw?.notification ?? raw?.data ?? raw;
      title = data.title || title;
      body = data.body || body;
      href = data.href || data.click_action || href;
    }
  } catch {
    // ignore parse error
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { href },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/engineer/my-tickets";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate?.(href);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(href);
    })
  );
});
