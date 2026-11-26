import type { components } from '@/shared/api/generated/schema';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { AudioTrack } from './audioTypes';
import { attachmentIdFromUrl } from './messageAudioTrack';

type Schema = components['schemas'];
export type WirePlaylistSummary = Schema['PlaylistSummary'];
export type WirePlaylist = Schema['Playlist'];
export type WirePlaylistTrack = Schema['PlaylistTrack'];
export type WirePlaylistTrackInput = Schema['PlaylistTrackInput'];

export const PLAYLIST_NAME_MAX = 60;
export const PLAYLIST_TRACKS_MAX = 1000;
const TITLE_MAX = 200;

export interface PlaylistSummary {
  id: string;
  name: string;
  trackCount: number;
  version: number;
}

export interface Playlist extends PlaylistSummary {
  tracks: AudioTrack[];
}

export type TrackChange =
  | { type: 'add'; track: AudioTrack }
  | { type: 'remove'; key: string }
  | { type: 'move'; from: number; to: number };

export const trackKey = (track: Pick<AudioTrack, 'attachmentId' | 'src' | 'id'>) => (
  track.attachmentId || attachmentIdFromUrl(track.src) || `track:${String(track.id)}`
);

export const summaryFromWire = (value: WirePlaylistSummary): PlaylistSummary => ({
  id: String(value.id), name: value.name, trackCount: value.track_count, version: value.version,
});

export const trackFromWire = (value: WirePlaylistTrack): AudioTrack => ({
  id: value.message_id ?? value.attachment_id,
  src: value.available && value.attachment ? resolveMediaUrl(value.attachment.url) : '',
  title: value.title,
  kind: 'music',
  attachmentId: String(value.attachment_id),
  ...(value.artist ? { artist: value.artist } : {}),
  ...(value.duration_seconds !== undefined ? { duration: value.duration_seconds } : {}),
  ...(value.attachment?.thumbnail_url ? { cover: resolveMediaUrl(value.attachment.thumbnail_url) } : {}),
  ...(value.chat_id ? { chatId: value.chat_id } : {}),
  ...(value.available ? {} : { unavailable: true }),
});

export const playlistFromWire = (value: WirePlaylist): Playlist => ({
  ...summaryFromWire(value), tracks: value.tracks.map(trackFromWire),
});

export const trackToWire = (track: AudioTrack): WirePlaylistTrackInput | null => {
  const attachmentId = track.attachmentId || attachmentIdFromUrl(track.src);
  const title = track.title.trim().slice(0, TITLE_MAX);
  if (!attachmentId || !title) return null;
  return {
    attachment_id: attachmentId,
    title,
    ...(track.chatId !== undefined ? { chat_id: String(track.chatId), message_id: String(track.id) } : {}),
    ...(track.artist ? { artist: track.artist.slice(0, TITLE_MAX) } : {}),
    ...(typeof track.duration === 'number' && Number.isFinite(track.duration) && track.duration >= 0
      ? { duration_seconds: Math.min(86400, track.duration) } : {}),
  };
};

export const tracksToWire = (tracks: AudioTrack[]) => {
  const seen = new Set<string>();
  return tracks.map(trackToWire).filter((track): track is WirePlaylistTrackInput => {
    if (!track || seen.has(track.attachment_id)) return false;
    seen.add(track.attachment_id);
    return true;
  }).slice(0, PLAYLIST_TRACKS_MAX);
};

export const canAddToPlaylist = (track: AudioTrack) => track.kind === 'music' && trackToWire(track) !== null;

export const hasTrack = (tracks: AudioTrack[], track: AudioTrack) => tracks.some((item) => trackKey(item) === trackKey(track));

export const applyTrackChange = (tracks: AudioTrack[], change: TrackChange): AudioTrack[] => {
  if (change.type === 'add') return hasTrack(tracks, change.track) ? tracks : [...tracks, change.track];
  if (change.type === 'remove') return tracks.filter((track) => trackKey(track) !== change.key);
  const { from, to } = change;
  if (from === to || !tracks[from] || !tracks[to]) return tracks;
  const next = [...tracks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export const cleanPlaylistName = (name: string) => name.trim().slice(0, PLAYLIST_NAME_MAX);

export interface LocalPlaylist {
  name: string;
  tracks: AudioTrack[];
}

const fingerprint = (name: string, tracks: AudioTrack[]) => `${cleanPlaylistName(name)}\u0000${tracksToWire(tracks).map((track) => track.attachment_id).join(',')}`;

export const localPlaylistsToUpload = (local: LocalPlaylist[], server: Playlist[]) => {
  const known = new Set(server.map((playlist) => fingerprint(playlist.name, playlist.tracks)));
  return local.filter((playlist) => {
    if (!cleanPlaylistName(playlist.name)) return false;
    const key = fingerprint(playlist.name, playlist.tracks);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
};
