// sw.js
const APP_SHELL_CACHE_NAME = 'app-shell-v2';
const DYNAMIC_CACHE_NAME = 'dynamic-cache-v1';

const BASE_URL = '/pwa-10a/';
// A. Recursos del App Shell (Caché Estática: Cache Only)
const APP_SHELL_ASSETS = [
    BASE_URL,
    BASE_URL+'index.html',
    BASE_URL+'calendario.html',
    BASE_URL+'formulario.html',
    BASE_URL+'acerca.html',
    BASE_URL+'offline.html',
    BASE_URL+'style.css',
    BASE_URL+'register.js',
    BASE_URL+'img/icons/192.png',
    BASE_URL+'img/icons/512.png',
];

// B. Recursos Dinámicos (Caché Dinámica: Cache First, Network Fallback)
const DYNAMIC_ASSET_URLS = [
    'https://unpkg.com/tailwindcss@^3/dist/tailwind.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css'
];

// 1. Evento 'install': Pre-caching del App Shell (Cache Only)
self.addEventListener('install', (event) => {
    console.log('SW: Instalando y pre-caching del App Shell (v2)...');
    event.waitUntil(
        caches.open(APP_SHELL_CACHE_NAME)
            .then((cache) => {
                return cache.addAll(APP_SHELL_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.warn('SW: Advertencia en precaching:', err))
    );
});

// 2. Evento 'activate': Limpieza de cachés antiguas 
self.addEventListener('activate', (event) => {
    console.log('SW: Activado. Limpiando cachés antiguas...');
    const cacheWhitelist = [APP_SHELL_CACHE_NAME, DYNAMIC_CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('SW: Borrando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// 3. Evento 'fetch': Implementación de estrategias mixtas
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  const pathname = requestUrl.pathname;

  // Estrategia 1: Cache Only para el App Shell
  const isAppShell = APP_SHELL_ASSETS.some((asset) => {
    return (
      pathname === asset || pathname === asset.replace(/\/$/, "/index.html")
    );
  });

  if (isAppShell) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        // Si no está en caché, ir a la red (aunque debería estar en caché)
        return fetch(request);
      })
    );
  }
  // Estrategia 2: Cache First, Network Fallback para recursos dinámicos
  else if (DYNAMIC_ASSET_URLS.some((url) => request.url.includes(url))) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((networkResponse) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            })
            .catch((error) => {
              throw error;
            });
        });
      })
    );
  }
  // Para las peticiones de navegación (páginas) que no están en el App Shell, usamos Network First o mostramos offline.html
  else if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(BASE_URL + "offline.html");
      })
    );
  }
  // Para cualquier otra petición
  else {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
  }
});