import { useEffect, useState } from 'react';
import { authFetch } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';

export type StickerSource = { url: string; failed: false; type: string } | { url: null; failed: boolean; type: string };

export const useStickerSource = (sourceUrl: string, sourceType = ''): StickerSource => {
  const [source, setSource] = useState<StickerSource>({ url: null, failed: false, type: sourceType });
  useEffect(() => {
    if (sourceUrl.startsWith('blob:')) {
      setSource({ url: sourceUrl, failed: false, type: sourceType });
      return undefined;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    authFetch(resolveMediaUrl(sourceUrl))
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSource({ url: objectUrl, failed: false, type: blob.type || sourceType });
      })
      .catch(() => { if (!cancelled) setSource({ url: null, failed: true, type: sourceType }); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceUrl, sourceType]);
  return source;
};
