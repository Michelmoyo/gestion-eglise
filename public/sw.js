// Service worker minimal : necessaire pour que la PWA soit installable
// (criteres Chrome : un service worker enregistre avec un gestionnaire
// "fetch"), mais ne met rien en cache. L'app est fortement dynamique
// (donnees Supabase en direct : caisse, presences, notifications) ; un
// cache agressif risquerait de servir des donnees perimees.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough : laisse le navigateur traiter la requete normalement.
});
