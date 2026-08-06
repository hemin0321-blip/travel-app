/**
 * Escape hatch for "the app looks stuck on an old version" — unregisters the
 * service worker and clears its caches, then reloads. Normally a new deploy
 * should take over on its own (see vite.config.ts's skipWaiting/clientsClaim),
 * but this gives a one-tap manual fallback instead of closing the whole browser.
 */
export async function hardReset(): Promise<void> {
  if (navigator.serviceWorker) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
  if (window.caches) {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((k) => window.caches.delete(k)));
  }
  window.location.reload();
}
