import { useEffect, useRef, useState } from 'react';
import { useAccessToken } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { acquireMedia, dropMedia, isProtectedMedia, peekMedia } from './mediaCache';

export const useAuthenticatedMedia = (source?: string, fallback?: string, enabled = true, onFailure?: () => void, attempt = 0) => {
  const token = useAccessToken();
  const latestToken = useRef(token);
  latestToken.current = token;
  const signedIn = !!token;
  const failureCallback = useRef(onFailure);
  failureCallback.current = onFailure;
  const [loaded, setLoaded] = useState<{ source: string; url: string; token: string | null; retry: string | null; attempt: number } | null>(null);
  const url = source ? resolveMediaUrl(source) : undefined;
  const protectedMedia = !!url && isProtectedMedia(url);
  const current = loaded?.source === url && loaded?.attempt === attempt ? loaded : null;
  const retry = current && !current.url && current.token !== token ? token : current?.retry ?? null;
  useEffect(() => {
    if (!enabled || !url || !protectedMedia || !signedIn) return;
    let active = true;
    const requestedWith = latestToken.current;
    if (attempt > 0) dropMedia(url);
    const lease = acquireMedia(url);
    lease.promise.then(objectUrl => {
      if (active) setLoaded({ source: url, url: objectUrl, token: requestedWith, retry, attempt });
    }, () => {
      if (!active) return;
      setLoaded({ source: url, url: '', token: requestedWith, retry, attempt });
      failureCallback.current?.();
    });
    return () => { active = false; lease.release(); };
  }, [url, protectedMedia, enabled, signedIn, retry, attempt]);
  if (!protectedMedia) return source;
  if (current) return current.url || fallback;
  return signedIn && attempt === 0 ? peekMedia(url) : undefined;
};
