import { useEffect, useState } from 'react';
import { authFetch } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';

export type StickerSource = { url: string; failed: false } | { url: null; failed: boolean };

export const useStickerSource = (sourceUrl: string): StickerSource => {
  const [source, setSource] = useState<StickerSource>({ url: null, failed: false });
  useEffect(() => {
    if (sourceUrl.startsWith('blob:')) {
      setSource({ url: sourceUrl, failed: false });
      return undefined;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    authFetch(resolveMediaUrl(sourceUrl))
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSource({ url: objectUrl, failed: false });
      })
      .catch(() => { if (!cancelled) setSource({ url: null, failed: true }); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceUrl]);
  return source;
};
