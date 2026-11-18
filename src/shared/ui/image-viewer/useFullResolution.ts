import { useEffect, useState } from 'react';
import type { ViewerImage } from './viewerTypes';

const FULL_RESOLUTION_SCALE = 1.2;

export const useFullResolution = (image: ViewerImage | undefined, scale: number) => {
  const [loaded, setLoaded] = useState<Record<string, true>>({});
  const url = image?.url;
  const wantsFull = !!image?.fullUrl && scale > FULL_RESOLUTION_SCALE;
  useEffect(() => {
    if (url && wantsFull) setLoaded((current) => (current[url] ? current : { ...current, [url]: true }));
  }, [url, wantsFull]);
  return image?.fullUrl && url && loaded[url] ? image.fullUrl : url;
};
