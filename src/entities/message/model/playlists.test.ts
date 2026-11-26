import { describe, expect, it, vi } from 'vitest';
import { ContractProblem } from '@/shared/api/tasks';
import type { AudioTrack } from './audioTypes';
import { applyTrackChange, canAddToPlaylist, localPlaylistsToUpload, trackFromWire, trackToWire, type Playlist } from './playlists';

const mocks = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ apiClient: { PUT: (...args: unknown[]) => mocks.put(...args) } }));

const song = (id: string, extra: Partial<AudioTrack> = {}): AudioTrack => ({
  id: `m${id}`, src: `/api/v2/attachments/a${id}/content`, title: `Song ${id}`, kind: 'music', ...extra,
});
const playlist = (tracks: AudioTrack[], version = 1): Playlist => ({ id: 'p', name: 'Road trip', trackCount: tracks.length, version, tracks });

describe('playlist tracks', () => {
  it('adds once, removes and moves', () => {
    const start = [song('1'), song('2')];
    expect(applyTrackChange(start, { type: 'add', track: song('1') })).toBe(start);
    expect(applyTrackChange(start, { type: 'add', track: song('3') }).map((track) => track.id)).toEqual(['m1', 'm2', 'm3']);
    expect(applyTrackChange(start, { type: 'remove', key: 'a1' }).map((track) => track.id)).toEqual(['m2']);
    expect(applyTrackChange(start, { type: 'move', from: 1, to: 0 }).map((track) => track.id)).toEqual(['m2', 'm1']);
  });

  it('maps tracks to and from the server and greys out lost ones', () => {
    expect(trackToWire(song('1', { chatId: '42', artist: 'Band', duration: 61 }))).toEqual({
      attachment_id: 'a1', title: 'Song 1', chat_id: '42', message_id: 'm1', artist: 'Band', duration_seconds: 61,
    });
    expect(trackToWire(song('1', { src: 'blob:x' }))).toBeNull();
    expect(canAddToPlaylist(song('1', { kind: 'voice' }))).toBe(false);
    expect(trackFromWire({ attachment_id: 'a9', title: 'Gone', available: false, message_id: 'm9' }))
      .toMatchObject({ id: 'm9', src: '', unavailable: true, attachmentId: 'a9' });
  });

  it('uploads only local playlists that are not on the server yet', () => {
    const server = [playlist([song('1')])];
    const local = [
      { name: ' Road trip ', tracks: [song('1')] },
      { name: 'Road trip', tracks: [song('2')] },
      { name: 'Gym', tracks: [] },
      { name: 'Gym', tracks: [] },
      { name: '  ', tracks: [] },
    ];
    expect(localPlaylistsToUpload(local, server).map((item) => [item.name, item.tracks.length])).toEqual([['Road trip', 1], ['Gym', 0]]);
  });
});

describe('changePlaylistTracks', () => {
  it('reloads and reapplies the change after a version conflict', async () => {
    const { changePlaylistTracks } = await import('../api/playlistsApi');
    const wire = (version: number, ids: string[]) => ({
      id: 'p', name: 'Road trip', track_count: ids.length, version, created_at: '', updated_at: '',
      tracks: ids.map((id) => ({ attachment_id: `a${id}`, title: `Song ${id}`, available: true })),
    });
    mocks.put
      .mockResolvedValueOnce({ error: { code: 'conflict' }, response: new Response(null, { status: 409 }) })
      .mockResolvedValueOnce({ data: wire(6, ['1', '9', '2']), response: new Response(null, { status: 200 }) });
    const reload = vi.fn(async () => playlist([song('1'), song('9')], 5));
    const result = await changePlaylistTracks(playlist([song('1')], 4), { type: 'add', track: song('2') }, reload);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(mocks.put).toHaveBeenLastCalledWith('/me/playlists/{playlist_id}/tracks', expect.objectContaining({
      body: { version: 5, tracks: [{ attachment_id: 'a1', title: 'Song 1' }, { attachment_id: 'a9', title: 'Song 9' }, { attachment_id: 'a2', title: 'Song 2' }] },
    }));
    expect(result.version).toBe(6);
  });

  it('does not retry other errors', async () => {
    const { changePlaylistTracks } = await import('../api/playlistsApi');
    mocks.put.mockResolvedValueOnce({ error: {}, response: new Response(null, { status: 422 }) });
    await expect(changePlaylistTracks(playlist([]), { type: 'add', track: song('2') }, vi.fn())).rejects.toBeInstanceOf(ContractProblem);
  });
});
