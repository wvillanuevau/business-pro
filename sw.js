// ══════════════════════════════════════════════
//  Royal Barbershop Pro — Service Worker
//  Versión: 1.0
// ══════════════════════════════════════════════

const CACHE_NAME = "businesspro-v1";
const CACHE_URLS = [
  "/business-pro/",
  "/business-pro/index.html",
  "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Karla:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js",
  "https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/umd/index.min.js"
];

// ── INSTALL: guardar archivos en caché ──
self.addEventListener("install", event => {
  console.log("[SW] Instalando...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        console.warn("[SW] Algunos archivos no se pudieron cachear:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar cachés viejos ──
self.addEventListener("activate", event => {
  console.log("[SW] Activando...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: servir desde caché, con red como respaldo ──
self.addEventListener("fetch", event => {
  // No interceptar peticiones a Firebase (siempre necesitan red)
  if (event.request.url.includes("firestore.googleapis.com") ||
      event.request.url.includes("firebase") ||
      event.request.url.includes("googleapis.com/v1")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Guardar en caché respuestas exitosas
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Sin red y sin caché: mostrar página offline si es navegación
        if (event.request.mode === "navigate") {
          return caches.match("/business-pro/index.html");
        }
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener("push", event => {
  let data = { title: "Royal Barbershop", body: "Tienes una notificación" };
  try { data = event.data.json(); } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "https://em-content.zobj.net/source/google/387/barber-pole_1f488.png",
      badge: "https://em-content.zobj.net/source/google/387/barber-pole_1f488.png",
      tag: data.tag || "barbershop-notif",
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || "/business-pro/" }
    })
  );
});

// ── CLICK EN NOTIFICACIÓN: abrir la app ──
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      // Si ya está abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes("negocio-pro") && "focus" in client) {
          return client.focus();
        }
      }
      // Si no está abierta, abrirla
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || "/business-pro/");
      }
    })
  );
});

// ── SYNC EN BACKGROUND (para cuando vuelve la conexión) ──
self.addEventListener("sync", event => {
  if (event.tag === "sync-data") {
    console.log("[SW] Sincronizando datos en background...");
    // La app maneja la sincronización con Firebase al volver online
  }
});
