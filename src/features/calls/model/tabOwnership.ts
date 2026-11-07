const LOCK_NAME = 'messenger-call-media';
const CHANNEL_NAME = 'messenger-calls';

export interface MediaOwnership {
  release: () => void;
}

const channel = () => (typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME));

const announce = () => {
  const target = channel();
  target?.postMessage({ type: 'media-owner-changed' });
  target?.close();
};

export const acquireMediaOwnership = (): Promise<MediaOwnership | null> => {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  if (!locks) return Promise.resolve({ release: () => undefined });
  return new Promise((resolve) => {
    let release: () => void = () => undefined;
    const held = locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
      if (!lock) {
        resolve(null);
        return undefined;
      }
      return new Promise<void>((done) => {
        release = done;
        announce();
        resolve({ release: () => { release(); void held.then(announce, announce); } });
      });
    });
    held.catch(() => resolve(null));
  });
};

export const isMediaOwnedElsewhere = async (ownedHere: boolean) => {
  if (ownedHere || typeof navigator === 'undefined' || !navigator.locks?.query) return false;
  try {
    const state = await navigator.locks.query();
    return !!state.held?.some((lock) => lock.name === LOCK_NAME);
  } catch {
    return false;
  }
};

export const onMediaOwnershipChange = (listener: () => void) => {
  const target = channel();
  if (!target) return () => undefined;
  target.onmessage = () => listener();
  return () => target.close();
};

export const waitForMediaRelease = (onReleased: () => void) => {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  if (!locks || typeof AbortController === 'undefined') return () => undefined;
  const controller = new AbortController();
  void locks.request(LOCK_NAME, { signal: controller.signal }, () => undefined)
    .then(() => { if (!controller.signal.aborted) onReleased(); }, () => undefined);
  return () => controller.abort();
};
