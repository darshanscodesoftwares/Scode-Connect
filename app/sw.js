const CACHE = "scode-connect-shell-v14";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./dashboard.js",
  "./forms.js",
  "./icons.js",
  "./model.js",
  "./seed.js",
  "./storage.js",
  "./local-store.js",
  "./ui.js",
  "./views.js",
  "./manifest.webmanifest",
  "./assets/scodeconnect-logo-only.png",
  "./assets/scodeconnect-orbital-tech-logo.png",
  "./assets/scodeconnect-magnetic-loader-v4.json",
  "./vendor/lottie.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("scode-connect-shell-") && k !== CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (new URL(event.request.url).pathname.includes("/api/")) return;
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await cache.match(
        event.request.mode === "navigate"
          ? new URL("./index.html", self.registration.scope)
          : event.request,
      );
      return response || fetch(event.request);
    })(),
  );
});
