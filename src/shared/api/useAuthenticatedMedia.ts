import { useEffect, useRef, useState } from 'react';
import { authFetch, useAccessToken } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';

export const useAuthenticatedMedia = (source?: string, fallback?: string, enabled = true, onFailure?: () => void) => {
  const token = useAccessToken();
  const latestToken = useRef(token);
  latestToken.current = token;
  const failureCallback = useRef(onFailure);
  failureCallback.current = onFailure;
  const [loaded, setLoaded] = useState<{ source: string; token: string | null; url: string; retry: string | null } | null>(null);
  const url = source ? resolveMediaUrl(source) : undefined;
  const base = new URL(import.meta.env.VITE_BASE_URL || '/', window.location.href);
  const target = url ? new URL(url, window.location.href) : null;
  const protectedMedia = target?.origin === base.origin && target.pathname.startsWith('/api/v2/');
  const hasToken = Boolean(token);
  const current = loaded?.source === url ? loaded : null;
  const retry = current && !current.url && current.token !== token ? token : current?.retry ?? null;
  useEffect(() => {
    if (!enabled || !url || !protectedMedia || !hasToken) return;
    const controller = new AbortController();
    const requestedWith = latestToken.current;
    let objectUrl: string | undefined;
    void authFetch(url, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(`Media request failed (${response.status})`);
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setLoaded({ source: url, token: requestedWith, url: objectUrl, retry });
    }).catch(() => {
      if (!controller.signal.aborted) {
        setLoaded({ source: url, token: requestedWith, url: '', retry });
        failureCallback.current?.();
      }
    });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, hasToken, protectedMedia, enabled, retry]);
  if (!protectedMedia) return source;
  return current ? current.url || fallback : undefined;
};
