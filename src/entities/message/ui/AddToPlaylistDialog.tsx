import { useState, useSyncExternalStore } from 'react';
import { Check, ListMusic, Plus } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/sonner';
import { addToPlaylist, createPlaylist, useAudioLibrary } from '../model/audioLibrary';
import type { AudioTrack } from '../model/audioPlayer';
import { playlistPickerTrack, requestAddToPlaylist, subscribePlaylistPicker, trackCountLabel } from '../model/trackActions';

interface AddToPlaylistDialogProps {
  track: AudioTrack | null;
  onClose: () => void;
}

export const AddToPlaylistDialog = ({ track, onClose }: AddToPlaylistDialogProps) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const playlists = useAudioLibrary((library) => library.playlists);
  const [name, setName] = useState('');

  const close = () => {
    setName('');
    onClose();
  };
  const add = (id: string, label: string) => {
    if (!track) return;
    addToPlaylist(id, track);
    toast(fillTemplate(t.addedToPlaylist, { name: label }));
    close();
  };
  const create = () => {
    if (!track) return;
    const playlist = createPlaylist(name, [track]);
    if (!playlist) return;
    toast(fillTemplate(t.addedToPlaylist, { name: playlist.name }));
    close();
  };

  return (
    <Dialog open={!!track} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t.addToPlaylist}</DialogTitle></DialogHeader>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); create(); }}>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.newPlaylist} aria-label={t.playlistName} maxLength={60} />
          <Button type="submit" disabled={!name.trim()}><Plus className="h-4 w-4" />{t.create}</Button>
        </form>
        {playlists.length > 0 ? (
          <ul className="-mx-2 max-h-72 overflow-y-auto">
            {playlists.map((playlist) => {
              const has = !!track && playlist.tracks.some((item) => String(item.id) === String(track.id));
              return (
                <li key={playlist.id}>
                  <button type="button" disabled={has} onClick={() => add(playlist.id, playlist.name)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <ListMusic className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{playlist.name}</span>
                      <span className="block text-xs text-muted-foreground">{trackCountLabel(playlist.tracks.length, t)}</span>
                    </span>
                    {has && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
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
