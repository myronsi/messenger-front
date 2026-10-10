import { useEffect, useState } from 'react';
import { API_ROOT, isApiUrl } from '@/shared/api/apiUrl';
import { authFetch } from '@/shared/auth/session';

// Avatars and attachments are served by the API and need the access token, which an <img> or <audio>
// cannot send. They are fetched with it and shown through object URLs, cached per URL: a media URL never
// changes its content (avatars carry their version), so a cached copy is always right.

const ABSOLUTE_URL = /^(?:https?:|blob:|data:)/i;
const MAX_ENTRIES = 400;

interface Entry {
  objectUrl?: string;
  promise?: Promise<string>;
}

const cache = new Map<string, Entry>();

const API_PATH = new URL(API_ROOT).pathname.replace(/\/+$/, '');

// toAbsoluteMediaUrl resolves a path the API returned (host-relative, "/api/v2/users/1/avatar?version=2")
// against the API's origin. The app's own assets ("/static/avatars/default.jpg") stay relative, and absolute,
// blob: and data: URLs are returned as they are.
export const toAbsoluteMediaUrl = (path: string) => {
  if (ABSOLUTE_URL.test(path)) return path;
  const isApiPath = !API_PATH || path === API_PATH || path.startsWith(`${API_PATH}/`);
  return isApiPath ? new URL(path, API_ROOT).toString() : path;
};

// needsToken tells whether a media URL is the API's and has to be fetched with the access token.
export const needsToken = (url: string) => isApiUrl(url);

const remember = (url: string, entry: Entry) => {
  cache.delete(url);
  cache.set(url, entry);
  while (cache.size > MAX_ENTRIES) {
    const [oldestUrl, oldest] = cache.entries().next().value as [string, Entry];
    cache.delete(oldestUrl);
    if (oldest.objectUrl) URL.revokeObjectURL(oldest.objectUrl);
  }
};

// cachedMediaUrl is the object URL of an API media URL that was loaded already, else undefined.
export const cachedMediaUrl = (url: string): string | undefined => {
  const entry = cache.get(url);
  if (entry?.objectUrl) remember(url, entry);
  return entry?.objectUrl;
};

// loadMediaUrl fetches an API media URL once (concurrent callers share the request) and resolves to an
// object URL. A failed fetch is not cached, so the next caller tries again.
export const loadMediaUrl = (url: string): Promise<string> => {
  const existing = cache.get(url);
  if (existing?.objectUrl) return Promise.resolve(existing.objectUrl);
  if (existing?.promise) return existing.promise;
  const promise = authFetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(`media ${response.status}`);
      const objectUrl = URL.createObjectURL(await response.blob());
      remember(url, { objectUrl });
      return objectUrl;
    })
    .catch((error: unknown) => {
      cache.delete(url);
      throw error;
    });
  remember(url, { promise });
  return promise;
};

// useMediaSource turns a media path or URL into something an element can show: API media as an object URL
// (the fallback until it is loaded, and if it cannot be), anything else as it is. `failed` tells that API
// media could not be loaded, e.g. an attachment of a chat the user has left (403) or one that was deleted.
export const useMediaSource = (src: string | null | undefined, fallback?: string): { src: string | undefined; failed: boolean } => {
  const absolute = src ? toAbsoluteMediaUrl(src) : '';
  const protectedUrl = absolute && needsToken(absolute) ? absolute : '';
  const [loaded, setLoaded] = useState<{ url: string; objectUrl: string } | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!protectedUrl || cachedMediaUrl(protectedUrl)) return undefined;
    let active = true;
    loadMediaUrl(protectedUrl)
      .then((objectUrl) => { if (active) setLoaded({ url: protectedUrl, objectUrl }); })
      .catch(() => { if (active) setFailedUrl(protectedUrl); });
    return () => { active = false; };
  }, [protectedUrl]);

  if (!absolute) return { src: fallback, failed: false };
  if (!protectedUrl) return { src: absolute, failed: false };
  const objectUrl = cachedMediaUrl(protectedUrl) ?? (loaded?.url === protectedUrl ? loaded.objectUrl : undefined);
  return { src: objectUrl ?? fallback, failed: !objectUrl && failedUrl === protectedUrl };
};

export const useMediaSrc = (src: string | null | undefined, fallback?: string): string | undefined => useMediaSource(src, fallback).src;

// mediaFetch fetches media for code that needs the bytes (downloads, audio analysis): with the access token
// for the API's media, as a plain request otherwise.
export const mediaFetch = (url: string, init: RequestInit = {}) => {
  const absolute = toAbsoluteMediaUrl(url);
  return needsToken(absolute) ? authFetch(absolute, init) : fetch(absolute, init);
};
