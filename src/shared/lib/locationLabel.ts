import type { components } from '@/shared/api/generated/schema';

export type ApproximateLocation = components['schemas']['Location'];

const regionNames = new Map<string, Intl.DisplayNames | null>();

const countryName = (code: string | null, fallback: string | null, language: string) => {
  if (!code) return fallback;
  if (!regionNames.has(language)) {
    try {
      regionNames.set(language, new Intl.DisplayNames([language], { type: 'region' }));
    } catch {
      regionNames.set(language, null);
    }
  }
  try {
    return regionNames.get(language)?.of(code) ?? fallback ?? code;
  } catch {
    return fallback ?? code;
  }
};

export const locationLabel = (location: ApproximateLocation | null | undefined, language: string) => {
  if (!location) return null;
  const country = countryName(location.country_code, location.country, language);
  const parts = [location.city, country].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(', ') : null;
};
