import { useEffect, useState } from 'react';
import { authFetch } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { isAnimatedWebP } from '@/shared/lib/animatedWebP';

export type StickerSource = { url: string; failed: false; type: string; animated: boolean } | { url: null; failed: boolean; type: string; animated: false };

const animatedOf = async (blob: Blob, type: string) => type === 'image/webp' && isAnimatedWebP(blob);

export const useStickerSource = (sourceUrl: string, sourceType = ''): StickerSource => {
  const [source, setSource] = useState<StickerSource>({ url: null, failed: false, type: sourceType, animated: false });
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    if (sourceUrl.startsWith('blob:')) {
      const ready = { url: sourceUrl, failed: false as const, type: sourceType };
      if (sourceType !== 'image/webp') setSource({ ...ready, animated: false });
      else {
        void fetch(sourceUrl).then((response) => response.blob()).then((blob) => animatedOf(blob, sourceType)).catch(() => false)
          .then((animated) => { if (!cancelled) setSource({ ...ready, animated }); });
      }
      return () => { cancelled = true; };
    }
    authFetch(resolveMediaUrl(sourceUrl))
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then(async (blob) => {
        const type = blob.type || sourceType;
        const animated = await animatedOf(blob, type);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSource({ url: objectUrl, failed: false, type, animated });
      })
      .catch(() => { if (!cancelled) setSource({ url: null, failed: true, type: sourceType, animated: false }); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceUrl, sourceType]);
  return source;
};
