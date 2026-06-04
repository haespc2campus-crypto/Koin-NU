const CACHE_NAME = "sikoinnu-shell-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/logo-karangsalam-2.png",
  "/logo-lazisnu.png",
  "/vendor/html5-qrcode.min.js",
  "/vendor/qrcode.js"
];

// Install Event: Pre-cache App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching App Shell");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error("[Service Worker] Pre-cache failed:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Intercept requests
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Skip API requests entirely to let app.js handle them (with IndexedDB fallback)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 2. Navigation requests (SPA routes): Network-First, fallback to cached index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Keep cache updated with latest index.html
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put("/", clone);
          });
          return response;
        })
        .catch(() => {
          // If offline, serve the cached index.html shell
          return caches.match("/").then((cachedResponse) => {
            return cachedResponse || caches.match("/index.html");
          });
        })
    );
    return;
  }

  // 3. Static assets & Third-party CDNs (like Leaflet): Cache-First, then Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Only cache valid status 200 responses
        if (!response || response.status !== 200 || response.type === "error") {
          return response;
        }

        // Cache static files and external assets dynamically
        const isStatic = STATIC_ASSETS.includes(url.pathname) || 
                         url.pathname.endsWith(".js") || 
                         url.pathname.endsWith(".css") || 
                         url.pathname.endsWith(".png") || 
                         url.pathname.endsWith(".jpg") || 
                         url.pathname.endsWith(".svg") || 
                         url.pathname.endsWith(".woff2") || 
                         url.hostname.includes("unpkg.com") || 
                         url.hostname.includes("fonts.googleapis.com") || 
                         url.hostname.includes("fonts.gstatic.com");

        if (isStatic) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }

        return response;
      });
    })
  );
});
