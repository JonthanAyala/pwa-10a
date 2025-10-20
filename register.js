//
// register.js
// Estrategia de Caché: Cache Only (App Shell)
//
// Este script registra el Service Worker ubicado en sw.js
//
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Registra el Service Worker en la raíz (/) del sitio.
        navigator.serviceWorker
          .register("https://jonthanayala.github.io/pwa-10a/sw.js")
          .then((registration) => {
            console.log(
              "Service Worker registrado con éxito. Scope:",
              registration.scope
            );
          })
          .catch((error) => {
            console.error("Fallo en el registro del Service Worker:", error);
          });
    });
} else {
    console.warn('El navegador no soporta Service Workers.');
}
