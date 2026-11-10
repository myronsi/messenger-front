export const configuredWebOrigin = (configured = String(import.meta.env.VITE_WEB_ORIGIN || '').trim()) => {
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
};

export const publicWebOrigin = (configured?: string) => configuredWebOrigin(configured) ?? window.location.origin;
