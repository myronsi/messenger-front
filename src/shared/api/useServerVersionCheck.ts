import { useEffect } from 'react';
import { useAppDispatch } from '@/shared/hooks/redux';
import { versionApi } from './versionApi';
import { reportServerVersions } from './updateGate';

export const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Asks the backend which contract version it speaks when the tab is opened or gets focus again, at most every 5 minutes.
export const useServerVersionCheck = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let lastCheckAt = 0;
    let isChecking = false;

    const check = async () => {
      if (document.visibilityState === 'hidden' || isChecking || Date.now() - lastCheckAt < VERSION_CHECK_INTERVAL_MS) return;
      isChecking = true;
      lastCheckAt = Date.now();
      try {
        const request = dispatch(versionApi.endpoints.getServerVersion.initiate(undefined, { forceRefetch: true }));
        const { data } = await request;
        request.unsubscribe();
        if (data) reportServerVersions({ apiVersion: data.apiVersion, minClientApiVersion: data.minClientApiVersion });
      } finally {
        isChecking = false;
      }
    };

    void check();
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [dispatch]);
};