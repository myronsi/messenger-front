import { useState, useSyncExternalStore } from 'react';
import { Check, ListMusic, Plus } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/sonner';
import { playlistsApi, useChangePlaylistTracksMutation, useCreatePlaylistMutation, useListPlaylistsQuery } from '../api/playlistsApi';
import type { AudioTrack } from '../model/audioPlayer';
import { hasTrack, type PlaylistSummary } from '../model/playlists';
import { playlistPickerTrack, requestAddToPlaylist, subscribePlaylistPicker, trackCountLabel } from '../model/trackActions';

interface AddToPlaylistDialogProps {
  track: AudioTrack | null;
  onClose: () => void;
}

const PlaylistOption = ({ playlist, track, onPick }: { playlist: PlaylistSummary; track: AudioTrack | null; onPick: () => void }) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const { data } = playlistsApi.endpoints.getPlaylist.useQueryState(playlist.id);
  const has = !!track && !!data && hasTrack(data.tracks, track);
  return (
    <li>
      <button type="button" disabled={has} onClick={onPick}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ListMusic className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{playlist.name}</span>
          <span className="block text-xs text-muted-foreground">{trackCountLabel(playlist.trackCount, t)}</span>
        </span>
        {has && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
      </button>
    </li>
  );
};

export const AddToPlaylistDialog = ({ track, onClose }: AddToPlaylistDialogProps) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const { data: playlists = [] } = useListPlaylistsQuery(undefined, { skip: !track });
  const [changeTracks] = useChangePlaylistTracksMutation();
  const [createPlaylist, { isLoading: creating }] = useCreatePlaylistMutation();
  const [name, setName] = useState('');

  const close = () => {
    setName('');
    onClose();
  };
  const add = async (id: string, label: string) => {
    if (!track) return;
    close();
    try {
      await changeTracks({ id, change: { type: 'add', track } }).unwrap();
      toast(fillTemplate(t.addedToPlaylist, { name: label }));
    } catch {
      toast(t.playlistSaveFailed);
    }
  };
  const create = async () => {
    if (!track || !name.trim()) return;
    try {
      const playlist = await createPlaylist({ name, tracks: [track] }).unwrap();
      toast(fillTemplate(t.addedToPlaylist, { name: playlist.name }));
      close();
    } catch (error) {
      toast((error as { status?: unknown } | null)?.status === 409 ? t.playlistLimit : t.playlistSaveFailed);
    }
  };

  return (
    <Dialog open={!!track} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t.addToPlaylist}</DialogTitle></DialogHeader>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void create(); }}>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.newPlaylist} aria-label={t.playlistName} maxLength={60} />
          <Button type="submit" disabled={!name.trim() || creating}><Plus className="h-4 w-4" />{t.create}</Button>
        </form>
        {playlists.length > 0 ? (
          <ul className="-mx-2 max-h-72 overflow-y-auto">
            {playlists.map((playlist) => (
              <PlaylistOption key={playlist.id} playlist={playlist} track={track} onPick={() => { void add(playlist.id, playlist.name); }} />
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">{t.emptyPlaylists}</p>}
      </DialogContent>
    </Dialog>
  );
};

export const AddToPlaylistHost = () => {
  const track = useSyncExternalStore(subscribePlaylistPicker, playlistPickerTrack, () => null);
  return <AddToPlaylistDialog track={track} onClose={() => requestAddToPlaylist(null)} />;
};
