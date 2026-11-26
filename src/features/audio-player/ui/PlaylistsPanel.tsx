import { useState } from 'react';
import { ArrowLeft, ListMusic, Pencil, Play, Shuffle, Trash2, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  playTracks, toggleShuffle, trackCountLabel, trackKey, useAudioPlayer, useChangePlaylistTracksMutation, useCreatePlaylistMutation,
  useDeletePlaylistMutation, useGetPlaylistQuery, useLazyGetPlaylistQuery, useListPlaylistsQuery, useRenamePlaylistMutation, type AudioTrack,
} from '@/entities/message';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/sonner';
import { TrackRow } from './TrackRow';

const playable = (tracks: AudioTrack[]) => tracks.filter((track) => !track.unavailable);

const isLimit = (error: unknown) => (error as { status?: unknown } | null)?.status === 409;

const NameForm = ({ initial = '', submitLabel, onSubmit, onCancel }: {
  initial?: string; submitLabel: string; onSubmit: (name: string) => void; onCancel?: () => void;
}) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const [name, setName] = useState(initial);
  return (
    <form className="flex gap-2 px-3 py-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) { onSubmit(name); setName(''); } }}>
      <Input autoFocus={!!onCancel} value={name} onChange={(event) => setName(event.target.value)} placeholder={t.newPlaylist}
        aria-label={t.playlistName} maxLength={60} />
      <Button type="submit" disabled={!name.trim()}>{submitLabel}</Button>
      {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>{t.cancel}</Button>}
    </form>
  );
};

const PlaylistDetail = ({ id, onBack }: { id: string; onBack: () => void }) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const { data: playlist } = useGetPlaylistQuery(id);
  const [rename] = useRenamePlaylistMutation();
  const [remove] = useDeletePlaylistMutation();
  const [changeTracks] = useChangePlaylistTracksMutation();
  const shuffleOn = useAudioPlayer((player) => player.shuffle);
  const [renaming, setRenaming] = useState(false);
  if (!playlist) return null;
  const tracks = playable(playlist.tracks);
  const failed = () => { toast(t.playlistSaveFailed); };
  const play = (shuffle: boolean) => {
    if (shuffle !== shuffleOn) toggleShuffle();
    playTracks(tracks, shuffle ? Math.floor(Math.random() * tracks.length) : 0);
  };
  return (
    <div data-testid="playlist-detail">
      <div className="flex items-center gap-1 px-2">
        <button type="button" onClick={onBack} aria-label={t.back} className="motion-press flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{playlist.name}</p>
          <p className="text-xs text-muted-foreground">{trackCountLabel(playlist.tracks.length, t)}</p>
        </div>
        <button type="button" onClick={() => setRenaming(true)} aria-label={t.renamePlaylist}
          className="motion-press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => { remove(playlist.id).unwrap().catch(failed); onBack(); }} aria-label={t.deletePlaylist}
          className="motion-press flex h-9 w-9 items-center justify-center rounded-full text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {renaming && (
        <NameForm initial={playlist.name} submitLabel={t.save} onCancel={() => setRenaming(false)}
          onSubmit={(name) => { rename({ id: playlist.id, name }).unwrap().catch(failed); setRenaming(false); }} />
      )}
      {playlist.tracks.length > 0 ? (
        <>
          {tracks.length > 0 && (
            <div className="flex gap-2 px-3 py-2">
              <Button type="button" className="flex-1" onClick={() => play(false)}><Play className="h-4 w-4 fill-current" />{t.playAll}</Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => play(true)}><Shuffle className="h-4 w-4" />{t.shuffle}</Button>
            </div>
          )}
          <ul>
            {playlist.tracks.map((track) => (
              <TrackRow key={trackKey(track)} track={track} onPlay={() => playTracks(tracks, Math.max(0, tracks.indexOf(track)))} actions={(
                <button type="button" aria-label={t.removeFromPlaylist}
                  onClick={() => changeTracks({ id: playlist.id, change: { type: 'remove', key: trackKey(track) } }).unwrap().catch(failed)}
                  className="motion-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              )} />
            ))}
          </ul>
        </>
      ) : <p className="px-5 py-6 text-center text-sm text-muted-foreground">{t.emptyPlaylist}</p>}
    </div>
  );
};

const PlayPlaylistButton = ({ id, label }: { id: string; label: string }) => {
  const [load, { isFetching }] = useLazyGetPlaylistQuery();
  const play = async () => {
    const tracks = playable((await load(id, true).unwrap().catch(() => null))?.tracks ?? []);
    if (tracks.length) playTracks(tracks);
  };
  return (
    <button type="button" disabled={isFetching} onClick={() => { void play(); }} aria-label={label}
      className="motion-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
      <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
    </button>
  );
};

export const PlaylistsPanel = () => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const { data: playlists = [] } = useListPlaylistsQuery();
  const [create] = useCreatePlaylistMutation();
  const [open, setOpen] = useState<string | null>(null);
  if (open && playlists.some((playlist) => playlist.id === open)) return <PlaylistDetail id={open} onBack={() => setOpen(null)} />;
  const createNamed = async (name: string) => {
    try {
      setOpen((await create({ name }).unwrap()).id);
    } catch (error) {
      toast(isLimit(error) ? t.playlistLimit : t.playlistSaveFailed);
    }
  };
  return (
    <div data-testid="audio-playlists">
      <NameForm submitLabel={t.create} onSubmit={(name) => { void createNamed(name); }} />
      {playlists.length === 0 ? <p className="px-5 py-6 text-center text-sm text-muted-foreground">{t.emptyPlaylists}</p> : (
        <ul>
          {playlists.map((playlist) => (
            <li key={playlist.id} className="flex h-14 items-center gap-1 pl-3 pr-1">
              <button type="button" onClick={() => setOpen(playlist.id)} className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-lg text-left hover:bg-accent/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <ListMusic className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{playlist.name}</span>
                  <span className="block text-xs text-muted-foreground">{trackCountLabel(playlist.trackCount, t)}</span>
                </span>
              </button>
              {playlist.trackCount > 0 && <PlayPlaylistButton id={playlist.id} label={`${t.playAll} ${playlist.name}`} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
