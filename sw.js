// sw.js
const APP_SHELL_CACHE_NAME = 'app-shell-v2';
const DYNAMIC_CACHE_NAME = 'dynamic-cache-v1';

// A. Recursos del App Shell (Caché Estática: Cache Only)
const APP_SHELL_ASSETS = [
    '/',
    'index.html',
    'calendario.html',
    'formulario.html',
    'acerca.html',
    'offline.html',
    'style.css',
    'register.js'
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
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const requestUrl = request.url;

    // Estrategia 1: Cache Only para el App Shell
    if (APP_SHELL_ASSETS.some(asset => requestUrl.endsWith(asset))) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    // Si no está en caché, ir a la red (aunque debería estar en caché)
                    return fetch(request);
                })
        );
    }
    // Estrategia 2: Cache First, Network Fallback para recursos dinámicos
    else if (DYNAMIC_ASSET_URLS.some(url => requestUrl.includes(url))) {
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return cache.match(request).then(response => {
                    // Si está en caché, lo devuelve
                    if (response) {
                        return response;
                    }
                    // Si no está en caché, lo busca en la red
                    return fetch(request).then(networkResponse => {
                        // Si la red responde, lo guarda en caché y lo devuelve
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    }).catch(error => {
                        // Si la red falla, podemos mostrar un error o devolver un recurso por defecto
                        // Pero en este caso, no tenemos un recurso por defecto, entonces lanzamos el error.
                        throw error;
                    });
                });
            })
        );
    }
    // Para las peticiones de navegación (páginas) que no están en el App Shell, usamos Network First o mostramos offline.html
    else if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match('offline.html');
            })
        );
    }
    // Para cualquier otra petición (por ejemplo, imágenes, etc.) que no están en ninguna lista, usamos la red primero y luego caché si está disponible.
    else {
        event.respondWith(
            caches.match(request).then(response => {
                return response || fetch(request);
            })
        );
    }
});