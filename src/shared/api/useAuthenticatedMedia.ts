import { useEffect, useRef, useState } from 'react';
import { useAccessToken } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { acquireMedia, isProtectedMedia, peekMedia } from './mediaCache';

export const useAuthenticatedMedia = (source?: string, fallback?: string, enabled = true, onFailure?: () => void) => {
  const token = useAccessToken();
  const latestToken = useRef(token);
  latestToken.current = token;
  const signedIn = !!token;
  const failureCallback = useRef(onFailure);
  failureCallback.current = onFailure;
  const [loaded, setLoaded] = useState<{ source: string; url: string; token: string | null; retry: string | null } | null>(null);
  const url = source ? resolveMediaUrl(source) : undefined;
  const protectedMedia = !!url && isProtectedMedia(url);
  const current = loaded?.source === url ? loaded : null;
  const retry = current && !current.url && current.token !== token ? token : current?.retry ?? null;
  useEffect(() => {
    if (!enabled || !url || !protectedMedia || !signedIn) return;
    let active = true;
    const requestedWith = latestToken.current;
    const lease = acquireMedia(url);
    lease.promise.then(objectUrl => {
      if (active) setLoaded({ source: url, url: objectUrl, token: requestedWith, retry });
    }, () => {
      if (!active) return;
      setLoaded({ source: url, url: '', token: requestedWith, retry });
      failureCallback.current?.();
    });
    return () => { active = false; lease.release(); };
  }, [url, protectedMedia, enabled, signedIn, retry]);
  if (!protectedMedia) return source;
  if (current) return current.url || fallback;
  return signedIn ? peekMedia(url) : undefined;
};
