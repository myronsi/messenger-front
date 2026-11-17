import { readSongTags } from '@/shared/lib/songTags';
import type { AudioTrack, RepeatMode } from './audioTypes';

const TAG_BYTES = 2 * 1024 * 1024;
const tagCache = new Map<string, Partial<AudioTrack>>();
const readTrackTags = async (source: string): Promise<Partial<AudioTrack>> => {
  const response = await fetch(source, source.startsWith('blob:') ? undefined : { headers: { Range: `bytes=0-${TAG_BYTES - 1}` } });
  if (!response.ok) return {};
  const tags = await readSongTags(await response.blob());
  return { title: tags.title, artist: tags.artist, cover: tags.cover ? URL.createObjectURL(tags.cover) : undefined };
};

const patchFor = (track: AudioTrack, tags: Partial<AudioTrack>): Partial<AudioTrack> => ({
  ...(tags.title && !track.artist ? { title: tags.title } : {}),
  ...(tags.artist && !track.artist ? { artist: tags.artist } : {}),
  ...(tags.cover && !track.cover ? { cover: tags.cover } : {}),
});

export const trackTagPatch = async (track: AudioTrack, source: string) => {
  const key = String(track.id);
  let tags = tagCache.get(key);
  if (!tags) {
    tags = await readTrackTags(source).catch(() => ({}));
    tagCache.set(key, tags);
  }
  return patchFor(track, tags);
};

export const shuffled = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
};

export const sameTrack = (a: AudioTrack, b: AudioTrack) => String(a.id) === String(b.id);

export const without = (list: AudioTrack[], track: AudioTrack) => list.filter((item) => !sameTrack(item, track));

export const REPEAT_ORDER: RepeatMode[] = ['off', 'all', 'one'];

export const trackUpdateListeners = new Set<(id: string, patch: Partial<AudioTrack>) => void>();

export const onTrackUpdated = (listener: (id: string, patch: Partial<AudioTrack>) => void) => {
  trackUpdateListeners.add(listener);
  return () => { trackUpdateListeners.delete(listener); };
};
