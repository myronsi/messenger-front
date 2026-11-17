import { fillTemplate } from '@/shared/lib/fillTemplate';
import { toast } from '@/shared/ui/sonner';
import { addToQueue, playNextInQueue, type AudioTrack } from './audioPlayer';

export const queueNext = (track: AudioTrack, message: string) => {
  playNextInQueue(track);
  toast(message);
};

export const queueLast = (track: AudioTrack, message: string) => {
  addToQueue(track);
  toast(message);
};

export const trackCountLabel = (count: number, t: { trackCount: string; trackCountOne: string }) => (
  count === 1 ? t.trackCountOne : fillTemplate(t.trackCount, { count: String(count) })
);

export const trackSubtitle = (track: AudioTrack, fromTemplate: string) => (
  [track.artist, track.origin ? fillTemplate(fromTemplate, { name: track.origin }) : ''].filter(Boolean).join(' · ')
);

let pickingTrack: AudioTrack | null = null;
const pickerListeners = new Set<() => void>();

export const requestAddToPlaylist = (track: AudioTrack | null) => {
  pickingTrack = track;
  pickerListeners.forEach((listener) => listener());
};

export const subscribePlaylistPicker = (listener: () => void) => {
  pickerListeners.add(listener);
  return () => { pickerListeners.delete(listener); };
};

export const playlistPickerTrack = () => pickingTrack;
