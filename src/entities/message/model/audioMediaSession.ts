import { plainEmoji } from '@/shared/lib/customEmoji';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { AudioTrack } from './audioTypes';

const supported = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator;

export const syncMediaSession = (track: AudioTrack | null, playing: boolean) => {
  if (!supported() || typeof MediaMetadata === 'undefined') return;
  navigator.mediaSession.metadata = track ? new MediaMetadata({
    title: plainEmoji(track.title), artist: plainEmoji(track.artist ?? track.origin ?? ''),
    artwork: track.cover ? [{ src: track.cover.startsWith('blob:') ? track.cover : resolveMediaUrl(track.cover) }] : [],
  }) : null;
  navigator.mediaSession.playbackState = track ? (playing ? 'playing' : 'paused') : 'none';
};

export const bindMediaSession = (actions: { play: () => void; pause: () => void; next: () => void; previous: () => void }) => {
  if (!supported()) return;
  navigator.mediaSession.setActionHandler?.('play', actions.play);
  navigator.mediaSession.setActionHandler?.('pause', actions.pause);
  navigator.mediaSession.setActionHandler?.('nexttrack', actions.next);
  navigator.mediaSession.setActionHandler?.('previoustrack', actions.previous);
};
