import { useEffect, useRef, useState } from 'react';
import { authFetch, useAccessToken } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';

export const useAuthenticatedMedia = (source?: string, fallback?: string, enabled = true, onFailure?: () => void) => {
  const token = useAccessToken();
  const failureCallback = useRef(onFailure);
  failureCallback.current = onFailure;
  const [loaded, setLoaded] = useState<{ source: string; token: string | null; url: string } | null>(null);
  const url = source ? resolveMediaUrl(source) : undefined;
  const base = new URL(import.meta.env.VITE_BASE_URL || '/', window.location.href);
  const target = url ? new URL(url, window.location.href) : null;
  const protectedMedia = target?.origin === base.origin && target.pathname.startsWith('/api/v2/');
  useEffect(() => {
    if (!enabled || !url || !protectedMedia || !token) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void authFetch(url, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(`Media request failed (${response.status})`);
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setLoaded({ source: url, token, url: objectUrl });
    }).catch(() => {
      if (!controller.signal.aborted) {
        setLoaded({ source: url, token, url: '' });
        failureCallback.current?.();
      }
    });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, token, protectedMedia, enabled]);
  if (!protectedMedia) return source;
  return loaded && loaded.source === url && loaded.token === token ? loaded.url || fallback : undefined;
};
