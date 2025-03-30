const CACHE_NAME = "pwa-cache-v1";

const ASSETS = [
  "./",
  "./students.html",
  "./src/styles.css",
  "./src/main.js",
  "./src/assets",
  "./src/assets/add.png",
  "./src/assets/bell.png",
  "./src/assets/bell-yellow.png",
  "./src/assets/burger.png",
  "./src/assets/chef.jpg",
  "./src/assets/close.png",
  "./src/assets/delete.png",
  "./src/assets/edit.png",
  "./src/assets/max.png",
  "./src/assets/next.png",
  "./src/assets/prev.png",
  "./src/assets/user.png",
  "./src/assets/yura.png",
  "./src/assets/icons.128.png",
  "./src/assets/icons.192.png",
  "./src/assets/icons.256.png",
  "./src/assets/icons.512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Кешування ресурсів...");
      return cache.addAll(ASSETS).catch(console.error);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => {
            // Fallback (optional offline page or just skip)
            return cachedResponse || caches.match("./students.html");
          });
        return cachedResponse || networkFetch;
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      console.log("Новий Service Worker активовано.");
      return self.clients.claim();
    })
  );
});