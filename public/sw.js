/* FE-Track service worker — cache app shell saja; jangan sentuh tile peta / cross-origin */
const CACHE = "fetrack-v2";
const PRECACHE = ["/", "/engineer/my-tickets", "/login", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // PENTING: biarkan browser handle tile MapLibre/Esri/dll (cross-origin).
  // Intercept + fallback HTML bikin peta abu-abu di mobile/PWA.
  if (url.origin !== self.location.origin) return;

  // Jangan cache API / auth / file privat
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // Hanya navigasi dokumen + asset same-origin
  const accept = request.headers.get("accept") || "";
  const isDocument =
    request.mode === "navigate" || accept.includes("text/html");
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json";

  if (!isDocument && !isStaticAsset) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (isDocument || isStaticAsset)) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(request)
          .then(
            (cached) =>
              cached ||
              (isDocument ? caches.match("/engineer/my-tickets") : undefined)
          )
      )
  );
});

/** FCM / Web Push */
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
    /* ignore */
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
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
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
