const SERVICE_WORKER_UPDATE_TIMEOUT_MS = 3000;

// Asks the service worker for the newest build first, otherwise the reload could be served from the stale precache.
export const reloadApp = async () => {
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations();
    if (registrations?.length) {
      await Promise.race([
        Promise.all(registrations.map((registration) => registration.update())),
        new Promise((resolve) => setTimeout(resolve, SERVICE_WORKER_UPDATE_TIMEOUT_MS)),
      ]);
    }
  } catch {
    // a failed update check must not prevent the reload
  }
  window.location.reload();
};