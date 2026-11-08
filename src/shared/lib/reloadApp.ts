const UPDATE_CHECK_TIMEOUT_MS = 10000;
const TAKEOVER_TIMEOUT_MS = 20000;

const delay = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

const pendingWorker = (registrations: readonly ServiceWorkerRegistration[]) =>
  registrations.map((registration) => registration.installing ?? registration.waiting).find(Boolean) ?? null;

const waitForTakeover = (worker: ServiceWorker) => new Promise<void>((resolve) => {
  const container = navigator.serviceWorker;
  const finish = () => {
    clearTimeout(timer);
    container.removeEventListener('controllerchange', finish);
    worker.removeEventListener('statechange', onStateChange);
    resolve();
  };
  const onStateChange = () => {
    if (worker.state === 'installed') worker.postMessage({ type: 'SKIP_WAITING' });
    if (worker.state === 'activated' || worker.state === 'redundant') finish();
  };
  const timer = setTimeout(finish, TAKEOVER_TIMEOUT_MS);
  container.addEventListener('controllerchange', finish);
  worker.addEventListener('statechange', onStateChange);
  onStateChange();
});

const activateNewBuild = async () => {
  const registrations = await navigator.serviceWorker?.getRegistrations();
  if (!registrations?.length) return;
  await Promise.race([Promise.all(registrations.map((registration) => registration.update())), delay(UPDATE_CHECK_TIMEOUT_MS)]);
  const worker = pendingWorker(registrations);
  if (worker) await waitForTakeover(worker);
};

const updateThenReload = async () => {
  await activateNewBuild().catch(() => undefined);
  window.location.reload();
};

let inFlight: Promise<void> | null = null;

export const reloadApp = () => {
  inFlight ??= updateThenReload();
  return inFlight;
};

export const resetReloadAppForTests = () => {
  inFlight = null;
};
