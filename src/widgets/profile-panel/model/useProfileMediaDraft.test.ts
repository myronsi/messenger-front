import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfileMediaDraft } from './useProfileMediaDraft';

const { api, mutation } = vi.hoisted(() => ({
  api: { setMusic: vi.fn(), deleteMusic: vi.fn(), setBackground: vi.fn(), deleteBackground: vi.fn() },
  mutation: (fn: (arg?: unknown) => unknown) => () => [(arg?: unknown) => ({ unwrap: () => fn(arg) })],
}));
vi.mock('@/features/profile', () => ({
  useSetMyMusicMutation: mutation(api.setMusic), useDeleteMyMusicMutation: mutation(api.deleteMusic),
  useSetMyBackgroundMutation: mutation(api.setBackground), useDeleteMyBackgroundMutation: mutation(api.deleteBackground),
}));

const song = { attachment: { id: '9' }, title: 'Song ', artist: '' } as never;
const user = { music: null, background: { kind: 'preset', preset: 'ocean' } } as never;

describe('useProfileMediaDraft', () => {
  beforeEach(() => Object.values(api).forEach((fn) => { fn.mockReset(); fn.mockResolvedValue({}); }));

  it('shows a draft without saving it until save is called', async () => {
    const { result } = renderHook(() => useProfileMediaDraft(user));
    expect(result.current.changed).toBe(false);
    act(() => { result.current.chooseMusic(song); });
    act(() => { void result.current.chooseBackground({ kind: 'color', colors: ['#000000'] }, { kind: 'color', colors: ['#000000'] }); });
    expect(result.current.music?.title).toBe('Song');
    expect(result.current.background).toEqual({ kind: 'color', colors: ['#000000'] });
    expect(api.setMusic).not.toHaveBeenCalled();
    await act(() => result.current.save());
    expect(api.setMusic).toHaveBeenCalledWith({ attachment_id: '9', title: 'Song', artist: null });
    expect(api.setBackground).toHaveBeenCalledWith({ kind: 'color', colors: ['#000000'] });
    expect(result.current.changed).toBe(false);
  });

  it('removes a background only when there is one and skips removing missing music', async () => {
    const { result } = renderHook(() => useProfileMediaDraft(user));
    act(() => { result.current.chooseMusic(null); });
    act(() => { void result.current.chooseBackground(null, null); });
    expect(result.current.background).toBeNull();
    await act(() => result.current.save());
    expect(api.deleteMusic).not.toHaveBeenCalled();
    expect(api.deleteBackground).toHaveBeenCalled();
  });

  it('throws the drafts away on discard', () => {
    const { result } = renderHook(() => useProfileMediaDraft(user));
    act(() => { result.current.chooseMusic(song); });
    act(() => { result.current.discard(); });
    expect(result.current.changed).toBe(false);
    expect(result.current.music).toBeNull();
    expect(result.current.version).toBe(1);
  });
});
