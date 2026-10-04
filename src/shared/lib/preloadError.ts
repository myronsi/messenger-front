import { reloadApp } from './reloadApp';

export const PRELOAD_RELOAD_KEY = 'preload_error_reload_at';
export const PRELOAD_RELOAD_WINDOW_MS = 30_000;

// After a deploy the hashed chunks of the old build are gone. Reload once to get the new index.html;
// if the error repeats right after that, let it surface instead of reloading in a loop.
export const handlePreloadError = (event: Event, now = Date.now(), reload: () => void = () => { void reloadApp(); }) => {
  const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY));
  if (Number.isFinite(lastReload) && lastReload > 0 && now - lastReload < PRELOAD_RELOAD_WINDOW_MS) return false;

  event.preventDefault();
  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(now));
  reload();
  return true;
};

export const installPreloadErrorReload = () => {
  window.addEventListener('vite:preloadError', (event) => { handlePreloadError(event); });
};