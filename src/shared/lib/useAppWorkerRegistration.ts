import { useEffect } from 'react';

let registrationStarted = false;

export function useAppWorkerRegistration(ready = true) {
  useEffect(() => {
    if (!ready || registrationStarted || !import.meta.env.PROD || import.meta.env.MODE === 'mobile'
      || !navigator.serviceWorker) return;

    // Installing the worker precaches the whole app. Start after the first screen
    // can render, so that download does not compete with startup.
    registrationStarted = true;
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      registrationStarted = false;
    });
  }, [ready]);
}
