self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  clients.claim();
});

// Required to enable PWA mode. No caching needed for your project.
self.addEventListener("fetch", () => {});
