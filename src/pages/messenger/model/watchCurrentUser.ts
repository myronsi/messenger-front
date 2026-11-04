import { dropInvalidSession, getAccessToken } from '@/shared/auth/session';

export const CURRENT_USER_RETRY_DELAYS_MS = [1000, 3000, 10000];

interface WatchCurrentUserOptions {
  fetchMe: () => Promise<Response>;
  onUser: (user: { username: string }) => void;
  onSignedOut: () => void;
}

export const watchCurrentUser = ({ fetchMe, onUser, onSignedOut }: WatchCurrentUserOptions) => {
  let timer = 0;
  let attempt = 0;
  let inFlight = false;
  let stopped = false;
  const stop = () => {
    stopped = true;
    window.clearTimeout(timer);
    window.removeEventListener('online', check);
  };
  async function check() {
    if (stopped || inFlight) return;
    inFlight = true;
    window.clearTimeout(timer);
    const response = await fetchMe().catch(() => null);
    const user = response?.ok ? await response.json().catch(() => null) : null;
    inFlight = false;
    if (stopped) return;
    if (user && getAccessToken()) {
      stop();
      onUser(user);
      return;
    }
    const rejected = response?.status === 401 || response?.status === 403;
    if (!rejected && getAccessToken()) {
      timer = window.setTimeout(() => void check(), CURRENT_USER_RETRY_DELAYS_MS[Math.min(attempt, CURRENT_USER_RETRY_DELAYS_MS.length - 1)]);
      attempt += 1;
      return;
    }
    stop();
    if (rejected) dropInvalidSession();
    onSignedOut();
  }
  window.addEventListener('online', check);
  void check();
  return stop;
};
