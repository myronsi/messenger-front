import type { LocationCreate } from '@/entities/message';

export const TITLE_MAX = 100;
export const MAX_ACCURACY_M = 10_000;

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

export const wrapLongitude = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

export const buildLocation = (point: { lat: number; lon: number }, accuracy: number | null, title: string): LocationCreate => {
  const name = title.trim().slice(0, TITLE_MAX);
  return {
    latitude: round6(Math.max(-90, Math.min(90, point.lat))),
    longitude: round6(wrapLongitude(point.lon)),
    ...(accuracy !== null ? { accuracy_m: Math.min(MAX_ACCURACY_M, Math.max(0, Math.round(accuracy))) } : {}),
    ...(name ? { title: name } : {}),
  };
};
