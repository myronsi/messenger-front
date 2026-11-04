import { useEffect, useRef, useState } from 'react';
import { useAccessToken } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { acquireMedia, isProtectedMedia, peekMedia } from './mediaCache';

export const useAuthenticatedMedia = (source?: string, fallback?: string, enabled = true, onFailure?: () => void) => {
  const signedIn = !!useAccessToken();
  const failureCallback = useRef(onFailure);
  failureCallback.current = onFailure;
  const [loaded, setLoaded] = useState<{ source: string; url: string } | null>(null);
  const url = source ? resolveMediaUrl(source) : undefined;
  const protectedMedia = !!url && isProtectedMedia(url);
  useEffect(() => {
    if (!enabled || !url || !protectedMedia || !signedIn) return;
    let active = true;
    const lease = acquireMedia(url);
    lease.promise.then(objectUrl => {
      if (active) setLoaded({ source: url, url: objectUrl });
    }, () => {
      if (!active) return;
      setLoaded({ source: url, url: '' });
      failureCallback.current?.();
    });
    return () => { active = false; lease.release(); };
  }, [url, protectedMedia, enabled, signedIn]);
  if (!protectedMedia) return source;
  if (loaded?.source === url) return loaded.url || fallback;
  return signedIn ? peekMedia(url) : undefined;
};
