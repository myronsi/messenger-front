export const syncNotificationWorkerLanguage = (language: string) => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.getRegistration) return;
  void navigator.serviceWorker.getRegistration().then((registration) => {
    registration?.active?.postMessage({ type: 'notification-settings', language, api: import.meta.env.VITE_BASE_URL || '' });
  }).catch(() => undefined);
};
