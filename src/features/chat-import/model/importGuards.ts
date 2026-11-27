import { useEffect } from 'react';

export const IMPORT_LOCK = 'messenger-chat-import';

export class ImportLockedError extends Error {
  constructor() {
    super('locked');
  }
}

interface LockManagerLike {
  request: <T>(name: string, options: { ifAvailable: boolean }, callback: (lock: unknown) => Promise<T>) => Promise<T>;
}

const lockManager = () => (typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { locks?: LockManagerLike }).locks);

export const withImportLock = async <T>(run: () => Promise<T>): Promise<T> => {
  const locks = lockManager();
  if (!locks) return run();
  return locks.request(IMPORT_LOCK, { ifAvailable: true }, async (lock) => {
    if (!lock) throw new ImportLockedError();
    return run();
  });
};

export const useLeaveWarning = (active: boolean) => {
  useEffect(() => {
    if (!active) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);
};

interface WakeLockLike {
  release: () => Promise<void>;
}

export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    const wake = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }).wakeLock;
    if (!active || !wake) return undefined;
    let sentinel: WakeLockLike | null = null;
    let stopped = false;
    const acquire = () => {
      if (stopped || document.visibilityState !== 'visible') return;
      void wake.request('screen').then((next) => {
        if (stopped) void next.release().catch(() => undefined);
        else sentinel = next;
      }).catch(() => undefined);
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', acquire);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
};
