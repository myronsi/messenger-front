import { keepOfflineCopy } from '@/shared/api/mediaCache';
import { attachmentIdOf, forgetPlaybackUrl, playbackUrl } from '@/shared/api/playbackUrl';
import type { AudioTrack } from './audioTypes';

const RETRY_WINDOW_MS = 10_000;
const retried = new Map<string, number>();

const streamable = (track: AudioTrack | null) => (track?.kind === 'music' ? attachmentIdOf(track.src) : undefined);

export const streamingSource = async (track: AudioTrack): Promise<string | null> => {
  const id = streamable(track);
  if (!id) return null;
  try {
    const url = await playbackUrl(id);
    keepOfflineCopy(track.src);
    return url;
  } catch {
    return null;
  }
};

export const retryStream = (track: AudioTrack | null, audio: HTMLAudioElement): boolean => {
  const id = streamable(track);
  if (!id) return false;
  const last = retried.get(id) ?? 0;
  if (Date.now() - last < RETRY_WINDOW_MS) return false;
  retried.set(id, Date.now());
  const position = audio.currentTime;
  const wasPlaying = !audio.paused;
  forgetPlaybackUrl(id);
  playbackUrl(id).then((url) => {
    audio.src = url;
    audio.currentTime = position;
    if (wasPlaying) void audio.play().catch(() => undefined);
  }, () => audio.dispatchEvent(new Event('error')));
  return true;
};
