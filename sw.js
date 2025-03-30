// Ім'я кешу, який використовуватиметься для збереження ресурсів
const CACHE_NAME = "pwa-cache-v1";

// Масив ресурсів, які будуть кешовані при встановленні Service Worker
// ви кешуєте всі свої файли
const ASSETS = [
  "/",                      // Головна сторінка
  "/students.html",            // HTML-файл
  "/styles.css",             // CSS-стилі
  "/main.js",             // Головний JavaScript-файл
  "/src/assets",                 // ❌ Некоректно: "icons" - це папка, її не можна кешувати напряму
// загалом так, але у мене не хотіло кешувати без цієї папки, якщо у вас кешує без додаткового вказування, то не додавайте її
  "src/assets/add.png",
  "src/assets/bell.png",
  "src/assets/bell-yellow.png",
  "src/assets/burger.png",
  "src/assets/chef.jpg",
  "src/assets/close.png",
  "src/assets/delete.png",
  "src/assets/edit.png",
  "src/assets/max.png",
  "src/assets/next.png",
  "src/assets/prev.png",
  "src/assets/user.png",
  "src/assets/yura.png",
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Відкрито кеш');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Очищення старих кешів при активації
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Стратегія кешування: "Cache First, Network Fallback"
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Спочатку повертаємо з кешу, якщо є
        if (response) {
          return response;
        }

        // Якщо немає в кеші, робимо запит до мережі
        return fetch(event.request)
          .then(networkResponse => {
            // Перевіряємо, чи валідна відповідь
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Клонуємо відповідь, щоб кешувати її
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(error => {
            console.log('Помилка завантаження з мережі:', error);

            // Якщо це запит на HTML-сторінку, можна повернути офлайн-сторінку
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Обробка запитів API
self.addEventListener('fetch', event => {
  // Перевіряємо, чи це запит до API
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      // Стратегія "Network First, Cache Fallback" для API
      fetch(event.request)
        .then(response => {
          // Кешуємо успішну відповідь від мережі
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME + '-api').then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Якщо мережа недоступна, повертаємо з кешу
          return caches.match(event.request);
        })
    );
    return; // Важливо для запобігання подвійної обробки
  }
});
