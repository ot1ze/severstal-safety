// Service Worker для автономной работы портала (v33)
// Кэширует интерфейс, данные инструкций, картинки СИЗ и QR-коды.
// Тяжёлые видео и PDF не кэшируются заранее, чтобы не перегружать память телефона.

const CACHE_NAME = "severstal-ot-v41";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css?v=41",
  "./js/data.js?v=41",
  "./js/app.js?v=41",
  "./media/brand/logo_color.png",
  "./media/brand/symbol_red.png",
  "./media/brand/app_icon_192.png",
  "./media/brand/app_icon_512.png",
  "./media/professions/steelmaker.webp",
  "./media/professions/roller.webp",
  "./media/professions/mechanic.webp",
  "./media/professions/blast_furnace.webp",
  "./media/professions/electrician.webp",
  "./media/professions/belaz.webp",
  "./media/professions_square/steelmaker.webp",
  "./media/professions_square/roller.webp",
  "./media/professions_square/mechanic.webp",
  "./media/professions_square/blast_furnace.webp",
  "./media/professions_square/electrician.webp",
  "./media/professions_square/belaz.webp",
  "./media/ppe/steelmaker_1.webp",
  "./media/ppe/steelmaker_2.webp",
  "./media/ppe/steelmaker_3.webp",
  "./media/ppe/steelmaker_4.webp",
  "./media/qr/steelmaker.png",
  "./media/qr/roller.png",
  "./media/qr/mechanic.png",
  "./media/qr/blast_furnace.png",
  "./media/qr/electrician.png",
  "./media/qr/belaz.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Кэшируем файлы по одному, чтобы случайная ошибка одного ресурса не сорвала установку
      return Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Не перехватываем внешние API (Supabase, Google Fonts) и видео-потоки
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith(".mp4")) return;

  // Для HTML/CSS/JS — сначала сеть (чтобы получать свежие версии), при потере сети — кэш
  const isCodeOrDoc =
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js");

  if (isCodeOrDoc) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkRes;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then((cached) => {
            if (cached) return cached;
            if (req.mode === "navigate") return caches.match("./index.html");
            return new Response("", { status: 504 });
          })
        )
    );
    return;
  }

  // Для картинок и QR-кодов — сначала кэш, затем сеть
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((networkRes) => {
        if (networkRes && networkRes.ok && !url.pathname.endsWith(".pdf")) {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return networkRes;
      });
    })
  );
});
