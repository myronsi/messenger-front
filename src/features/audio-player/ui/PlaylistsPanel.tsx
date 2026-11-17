import { useState } from 'react';
import { ArrowLeft, ListMusic, Pencil, Play, Shuffle, Trash2, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  createPlaylist, deletePlaylist, playTracks, removeFromPlaylist, renamePlaylist, toggleShuffle, trackCountLabel, useAudioLibrary, useAudioPlayer,
} from '@/entities/message';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { TrackRow } from './TrackRow';

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
  const playlist = useAudioLibrary((library) => library.playlists.find((item) => item.id === id));
  const shuffleOn = useAudioPlayer((player) => player.shuffle);
  const [renaming, setRenaming] = useState(false);
  if (!playlist) return null;
  const play = (shuffle: boolean) => {
    if (shuffle !== shuffleOn) toggleShuffle();
    playTracks(playlist.tracks, shuffle ? Math.floor(Math.random() * playlist.tracks.length) : 0);
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
        <button type="button" onClick={() => { deletePlaylist(playlist.id); onBack(); }} aria-label={t.deletePlaylist}
          className="motion-press flex h-9 w-9 items-center justify-center rounded-full text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {renaming && (
        <NameForm initial={playlist.name} submitLabel={t.save} onCancel={() => setRenaming(false)}
          onSubmit={(name) => { renamePlaylist(playlist.id, name); setRenaming(false); }} />
      )}
      {playlist.tracks.length > 0 ? (
        <>
          <div className="flex gap-2 px-3 py-2">
            <Button type="button" className="flex-1" onClick={() => play(false)}><Play className="h-4 w-4 fill-current" />{t.playAll}</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => play(true)}><Shuffle className="h-4 w-4" />{t.shuffle}</Button>
          </div>
          <ul>
            {playlist.tracks.map((track, index) => (
              <TrackRow key={track.id} track={track} onPlay={() => playTracks(playlist.tracks, index)} actions={(
                <button type="button" onClick={() => removeFromPlaylist(playlist.id, track.id)} aria-label={t.removeFromPlaylist}
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

export const PlaylistsPanel = () => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const playlists = useAudioLibrary((library) => library.playlists);
  const [open, setOpen] = useState<string | null>(null);
  if (open && playlists.some((playlist) => playlist.id === open)) return <PlaylistDetail id={open} onBack={() => setOpen(null)} />;
  return (
    <div data-testid="audio-playlists">
      <NameForm submitLabel={t.create} onSubmit={(name) => { const created = createPlaylist(name); if (created) setOpen(created.id); }} />
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
                  <span className="block text-xs text-muted-foreground">{trackCountLabel(playlist.tracks.length, t)}</span>
                </span>
              </button>
              {playlist.tracks.length > 0 && (
                <button type="button" onClick={() => playTracks(playlist.tracks)} aria-label={`${t.playAll} ${playlist.name}`}
                  className="motion-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
