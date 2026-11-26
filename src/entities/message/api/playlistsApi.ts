import { messengerApi } from '@/shared/api/baseApi';
import { apiClient } from '@/shared/api/client';
import { ContractProblem, apiTask, contractData } from '@/shared/api/tasks';
import type { AudioTrack } from '../model/audioTypes';
import {
  applyTrackChange, cleanPlaylistName, playlistFromWire, summaryFromWire, tracksToWire, type Playlist, type PlaylistSummary, type TrackChange,
} from '../model/playlists';

const LIST = { type: 'Playlist' as const, id: 'LIST' };

export const fetchPlaylist = async (id: string, signal?: AbortSignal) => playlistFromWire(contractData(
  await apiClient.GET('/me/playlists/{playlist_id}', { params: { path: { playlist_id: id } }, signal }),
));

export const fetchPlaylistSummaries = async (signal?: AbortSignal) => (
  contractData(await apiClient.GET('/me/playlists', { signal })).items.map(summaryFromWire)
);

export const createPlaylistRequest = async (name: string, tracks: AudioTrack[] = []) => playlistFromWire(contractData(
  await apiClient.POST('/me/playlists', { body: { name: cleanPlaylistName(name), ...(tracks.length ? { tracks: tracksToWire(tracks) } : {}) } }),
));

const putTracks = async (playlist: Playlist, tracks: AudioTrack[]) => playlistFromWire(contractData(await apiClient.PUT('/me/playlists/{playlist_id}/tracks', {
  params: { path: { playlist_id: playlist.id } },
  body: { version: playlist.version, tracks: tracksToWire(tracks) },
})));

export const isConflict = (error: unknown) => error instanceof ContractProblem && error.status === 409;

export const changePlaylistTracks = async (current: Playlist, change: TrackChange, reload: () => Promise<Playlist> = () => fetchPlaylist(current.id)) => {
  const next = applyTrackChange(current.tracks, change);
  if (next === current.tracks) return current;
  try {
    return await putTracks(current, next);
  } catch (error) {
    if (!isConflict(error)) throw error;
    const fresh = await reload();
    const retried = applyTrackChange(fresh.tracks, change);
    return retried === fresh.tracks ? fresh : putTracks(fresh, retried);
  }
};

export const playlistsApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    listPlaylists: builder.query<PlaylistSummary[], void>({
      queryFn: (_, { signal }) => apiTask(() => fetchPlaylistSummaries(signal)),
      providesTags: (result) => [LIST, ...(result ?? []).map((playlist) => ({ type: 'Playlist' as const, id: playlist.id }))],
    }),
    getPlaylist: builder.query<Playlist, string>({
      queryFn: (id, { signal }) => apiTask(() => fetchPlaylist(id, signal)),
      providesTags: (_result, _error, id) => [{ type: 'Playlist', id }],
    }),
    createPlaylist: builder.mutation<Playlist, { name: string; tracks?: AudioTrack[] }>({
      queryFn: ({ name, tracks }) => apiTask(() => createPlaylistRequest(name, tracks)),
      invalidatesTags: [LIST],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled;
        void dispatch(playlistsApi.util.upsertQueryData('getPlaylist', data.id, data));
      },
    }),
    renamePlaylist: builder.mutation<PlaylistSummary, { id: string; name: string }>({
      queryFn: ({ id, name }) => apiTask(async () => summaryFromWire(contractData(await apiClient.PATCH('/me/playlists/{playlist_id}', {
        params: { path: { playlist_id: id } }, body: { name: cleanPlaylistName(name) },
      })))),
      onQueryStarted: async ({ id, name }, { dispatch, queryFulfilled }) => {
        const patches = [
          dispatch(playlistsApi.util.updateQueryData('listPlaylists', undefined, (draft) => {
            const item = draft.find((playlist) => playlist.id === id);
            if (item) item.name = cleanPlaylistName(name);
          })),
          dispatch(playlistsApi.util.updateQueryData('getPlaylist', id, (draft) => { draft.name = cleanPlaylistName(name); })),
        ];
        try {
          const { data } = await queryFulfilled;
          dispatch(playlistsApi.util.updateQueryData('getPlaylist', id, (draft) => { draft.version = data.version; }));
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: [LIST],
    }),
    deletePlaylist: builder.mutation<void, string>({
      queryFn: (id) => apiTask(async () => { contractData(await apiClient.DELETE('/me/playlists/{playlist_id}', { params: { path: { playlist_id: id } } })); }),
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patch = dispatch(playlistsApi.util.updateQueryData('listPlaylists', undefined, (draft) => draft.filter((playlist) => playlist.id !== id)));
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [LIST],
    }),
    changePlaylistTracks: builder.mutation<Playlist, { id: string; change: TrackChange }>({
      queryFn: ({ id, change }, { getState, dispatch }) => apiTask(async () => {
        const state = getState() as Parameters<ReturnType<typeof playlistsApi.endpoints.getPlaylist.select>>[0];
        const base = playlistsApi.endpoints.getPlaylist.select(id)(state).data ?? await fetchPlaylist(id);
        const patch = dispatch(playlistsApi.util.updateQueryData('getPlaylist', id, (draft) => {
          draft.tracks = applyTrackChange(draft.tracks, change);
        })) as unknown as { undo: () => void };
        try {
          const data = await changePlaylistTracks(base, change);
          void dispatch(playlistsApi.util.upsertQueryData('getPlaylist', id, data));
          dispatch(playlistsApi.util.updateQueryData('listPlaylists', undefined, (draft) => {
            const item = draft.find((playlist) => playlist.id === id);
            if (item) Object.assign(item, { trackCount: data.trackCount, version: data.version });
          }));
          return data;
        } catch (error) {
          patch.undo();
          throw error;
        }
      }),
    }),
  }),
});

export const {
  useListPlaylistsQuery, useGetPlaylistQuery, useLazyGetPlaylistQuery, useCreatePlaylistMutation, useRenamePlaylistMutation, useDeletePlaylistMutation,
  useChangePlaylistTracksMutation,
} = playlistsApi;
