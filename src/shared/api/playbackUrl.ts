import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '@/shared/auth/session';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { apiUrl } from './config';
import { keepOfflineCopy } from './mediaCache';
import { isOffline } from '@/shared/lib/network';

export type PlaybackVariant = 'source' | 'animation';

interface Lease { url: string; expiresAt: number }

const ATTACHMENT_CONTENT = /\/attachments\/([0-9a-f-]{36})\/content(?:\?(.*))?$/i;
const MARGIN_MS = 30_000;
const leases = new Map<string, Lease>();
const pending = new Map<string, Promise<string>>();

export const attachmentIdOf = (url?: string | null) => (url ? ATTACHMENT_CONTENT.exec(url.split('#')[0])?.[1] : undefined);

export const variantOf = (url?: string | null): PlaybackVariant | undefined => {
  const query = url ? ATTACHMENT_CONTENT.exec(url.split('#')[0])?.[2] : undefined;
  const variant = query ? new URLSearchParams(query).get('variant') : null;
  return variant === 'source' || variant === 'animation' ? variant : undefined;
};

const keyOf = (id: string, variant?: PlaybackVariant) => `${id}:${variant ?? ''}`;

export const forgetPlaybackUrl = (id: string, variant?: PlaybackVariant) => {
  leases.delete(keyOf(id, variant));
};

export const playbackUrl = (id: string, variant?: PlaybackVariant): Promise<string> => {
  const key = keyOf(id, variant);
  const lease = leases.get(key);
  if (lease && lease.expiresAt - MARGIN_MS > Date.now()) return Promise.resolve(lease.url);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const request = authFetch(apiUrl(`/attachments/${id}/playback${variant ? `?variant=${variant}` : ''}`), { method: 'POST' })
    .then(async response => {
      if (!response.ok) throw new Error(`playback ${response.status}`);
      const body = await response.json() as { url: string; expires_at: string };
      const url = resolveMediaUrl(body.url);
      leases.set(key, { url, expiresAt: Date.parse(body.expires_at) || Date.now() + 60_000 });
      return url;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
};

export const warmPlaybackUrl = (source?: string | null) => {
  const id = attachmentIdOf(source);
  if (id) void playbackUrl(id).catch(() => undefined);
};

export const useWarmPlaybackUrl = (source: string | undefined, enabled: boolean) => {
  const [node, setNode] = useState<Element | null>(null);
  useEffect(() => {
    if (!enabled || !node || !attachmentIdOf(source) || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      warmPlaybackUrl(source);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, source, enabled]);
  return setNode;
};

export const usePlaybackUrl = (source?: string, enabled = true) => {
  const id = attachmentIdOf(source);
  const variant = variantOf(source);
  const [state, setState] = useState<{ key: string; url?: string; attempt: number; failed?: boolean }>({ key: '', attempt: 0 });
  const key = id ? keyOf(id, variant) : '';
  const attempt = state.key === key ? state.attempt : 0;
  useEffect(() => {
    if (!id || !enabled) return;
    let active = true;
    playbackUrl(id, variant).then(
      url => {
        if (!active) return;
        setState(current => ({ key, url, attempt: current.key === key ? current.attempt : 0 }));
        keepOfflineCopy(source);
      },
      () => { if (active) setState({ key, attempt, failed: true }); },
    );
    return () => { active = false; };
  }, [id, variant, key, enabled, attempt, source]);
  const refresh = useCallback(() => {
    if (!id) return false;
    if (attempt >= 2) return false;
    forgetPlaybackUrl(id, variant);
    setState({ key, url: undefined, attempt: attempt + 1 });
    return true;
  }, [id, variant, key, attempt]);
  if (!id || (state.key === key && state.failed) || isOffline()) return { src: undefined, refresh, streaming: false };
  return { src: state.key === key ? state.url : undefined, refresh, streaming: true };
};
