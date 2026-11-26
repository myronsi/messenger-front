import { createPlaylistRequest, fetchPlaylist, fetchPlaylistSummaries } from '../api/playlistsApi';
import { dropLocalPlaylists, localPlaylists } from './audioLibrary';
import { cleanPlaylistName, localPlaylistsToUpload, type Playlist } from './playlists';

let running: Promise<boolean> | null = null;

const migrate = async () => {
  const local = localPlaylists();
  if (!local.length) return false;
  const names = new Set(local.map((playlist) => cleanPlaylistName(playlist.name)));
  const summaries = await fetchPlaylistSummaries();
  const sameName: Playlist[] = await Promise.all(summaries.filter((summary) => names.has(summary.name)).map((summary) => fetchPlaylist(summary.id)));
  for (const playlist of [...localPlaylistsToUpload(local, sameName)].reverse()) {
    await createPlaylistRequest(playlist.name, playlist.tracks);
  }
  dropLocalPlaylists();
  return true;
};

export const migrateLocalPlaylists = () => {
  running ??= migrate().finally(() => { running = null; });
  return running;
};
