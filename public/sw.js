const CACHE_NAME = "pwa-cache-v1";

// Get the base URL to handle GitHub Pages or other subpath deployments
const getBaseUrl = () => {
  // For GitHub Pages, this might be something like /PVI/
  return self.location.pathname.replace(/\/sw\.js$/, '/');
};

const BASE_URL = getBaseUrl();

// Assets with correct paths relative to where the SW is registered
const ASSETS = [
  BASE_URL,
  `${BASE_URL}students.html`,
  `${BASE_URL}src/styles.css`,
  `${BASE_URL}src/main.js`,
  `${BASE_URL}src/assets/add.png`,
  `${BASE_URL}src/assets/bell.png`,
  `${BASE_URL}src/assets/bell-yellow.png`,
  `${BASE_URL}src/assets/burger.png`,
  `${BASE_URL}src/assets/chef.jpg`,
  `${BASE_URL}src/assets/close.png`,
  `${BASE_URL}src/assets/delete.png`,
  `${BASE_URL}src/assets/edit.png`,
  `${BASE_URL}src/assets/max.png`,
  `${BASE_URL}src/assets/next.png`,
  `${BASE_URL}src/assets/prev.png`,
  `${BASE_URL}src/assets/user.png`,
  `${BASE_URL}src/assets/yura.png`,
  `${BASE_URL}src/assets/icons.128.png`,
  `${BASE_URL}src/assets/icons.192.png`,
  `${BASE_URL}src/assets/icons.256.png`,
  `${BASE_URL}src/assets/icons.512.png`,
];

// Log the base URL for debugging
console.log('Service Worker base URL:', BASE_URL);
console.log('Assets to cache:', ASSETS);

// Helper function to cache assets individually
const cacheAssets = async (cache) => {
  const failedAssets = [];

  for (const asset of ASSETS) {
    try {
      // Use no-cors mode to handle potential cross-origin issues
      const request = new Request(asset, { mode: 'no-cors' });
      const response = await fetch(request);
      await cache.put(request, response);
      console.log(`Successfully cached: ${asset}`);
    } catch (error) {
      console.warn(`Failed to cache: ${asset}`, error);
      failedAssets.push(asset);
    }
  }

  if (failedAssets.length > 0) {
    console.warn('Some assets failed to cache:', failedAssets);
  }

  return true;
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching assets with base path:", BASE_URL);
      return cacheAssets(cache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Skip non-HTTP/HTTPS requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Only cache successful HTTP/HTTPS responses
            if (networkResponse.ok &&
              (event.request.url.startsWith('http://') ||
                event.request.url.startsWith('https://'))) {
              // Clone before using the response
              cache.put(event.request, networkResponse.clone()).catch(err => {
                console.warn('Failed to update cache:', event.request.url, err);
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.warn('Network fetch failed:', error);
            // Return cached response or fallback
            return cachedResponse || caches.match(`${BASE_URL}students.html`);
          });

        // Return cached response if available, otherwise fetch from network
        return cachedResponse || fetchPromise;
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
      console.log("Service Worker activated successfully.");
      return self.clients.claim();
    })
  );
});