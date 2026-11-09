import { dropInvalidSession, getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { hasSessionChanged } from '@/shared/auth/tokenClaims';

export const CURRENT_USER_RETRY_DELAYS_MS = [1000, 3000, 10000];

interface WatchCurrentUserOptions<User> {
  fetchMe: () => Promise<{ user?: User; status?: number }>;
  onUser: (user: User) => void;
  onSignedOut: () => void;
}

export const watchCurrentUser = <User,>({ fetchMe, onUser, onSignedOut }: WatchCurrentUserOptions<User>) => {
  let timer = 0;
  let attempt = 0;
  let inFlight = false;
  let stopped = false;
  let previousToken = getAccessToken();
  const unsubscribe = subscribeToAccessToken((token) => {
    if (!token || (previousToken && hasSessionChanged(previousToken, token))) {
      stop();
      return;
    }
    previousToken = token;
  });
  function stop() {
    stopped = true;
    window.clearTimeout(timer);
    window.removeEventListener('online', check);
    unsubscribe();
  }
  async function check() {
    if (stopped || inFlight) return;
    inFlight = true;
    window.clearTimeout(timer);
    const response = await fetchMe().catch(() => null);
    const user = response?.user;
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
