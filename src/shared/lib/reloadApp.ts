const SERVICE_WORKER_UPDATE_TIMEOUT_MS = 3000;
const SERVICE_WORKER_TAKEOVER_TIMEOUT_MS = 5000;

const delay = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

// A new worker that is still installing or waiting only serves the new build once it controls the page.
const waitForNewWorker = (registrations: readonly ServiceWorkerRegistration[]) => new Promise<void>((resolve) => {
  const container = navigator.serviceWorker;
  if (!registrations.some((registration) => registration.installing || registration.waiting)) {
    resolve();
    return;
  }
  const finish = () => {
    clearTimeout(timer);
    container.removeEventListener('controllerchange', finish);
    resolve();
  };
  const timer = setTimeout(finish, SERVICE_WORKER_TAKEOVER_TIMEOUT_MS);
  container.addEventListener('controllerchange', finish);
});

// Asks the service worker for the newest build first, otherwise the reload could be served from the stale precache.
export const reloadApp = async () => {
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations();
    if (registrations?.length) {
      await Promise.race([Promise.all(registrations.map((registration) => registration.update())), delay(SERVICE_WORKER_UPDATE_TIMEOUT_MS)]);
      await waitForNewWorker(registrations);
    }
  } catch {
    // a failed update check must not prevent the reload
  }
  window.location.reload();
};