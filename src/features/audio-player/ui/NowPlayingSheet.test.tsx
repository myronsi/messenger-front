import { act, fireEvent, render as renderView, screen, waitFor, within } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { ReactElement } from 'react';
import { messengerApi } from '@/shared/api/baseApi';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { audioPlayerState, playAudio, rememberPlayed, stopAudio, type AudioTrack } from '@/entities/message';
import { openNowPlaying } from '../model/nowPlaying';
import { NowPlayingHost } from './NowPlayingSheet';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ translations: en, language: 'en' }) };
});
vi.mock('@/shared/api/mediaCache', () => ({ isProtectedMedia: () => false, acquireMedia: vi.fn() }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('@/shared/auth/session', () => ({ getAccessToken: () => 'token', subscribeToAccessToken: () => () => undefined, authFetch: vi.fn() }));
vi.mock('@/shared/auth/tokenClaims', async (importOriginal) => ({ ...await importOriginal<typeof import('@/shared/auth/tokenClaims')>(), getTokenSubject: () => 'me' }));
vi.mock('@/shared/ui/sonner', () => ({ toast: vi.fn() }));

type FakePlaylist = { id: string; name: string; track_count: number; version: number; created_at: string; updated_at: string; tracks: unknown[] };
const server = vi.hoisted(() => ({ playlists: [] as FakePlaylist[] }));
vi.mock('@/shared/api/client', () => {
  const ok = (data: unknown, status = 200) => ({ data, response: new Response(null, { status }) });
  return {
    apiClient: {
      GET: async (path: string, options?: { params?: { path?: { playlist_id?: string } } }) => {
        if (path === '/me/playlists') return ok({ items: server.playlists.map(({ tracks: _tracks, ...summary }) => summary) });
        return ok(server.playlists.find((playlist) => playlist.id === options?.params?.path?.playlist_id));
      },
      POST: async (_path: string, { body }: { body: { name: string } }) => {
        const playlist = { id: String(server.playlists.length + 1), name: body.name, track_count: 0, version: 1, created_at: '', updated_at: '', tracks: [] };
        server.playlists.unshift(playlist);
        return ok(playlist, 201);
      },
    },
  };
});

const render = (view: ReactElement) => {
  const store = configureStore({
    reducer: { [messengerApi.reducerPath]: messengerApi.reducer },
    middleware: (getDefault) => getDefault().concat(messengerApi.middleware),
  });
  return renderView(<Provider store={store}>{view}</Provider>);
};

const song = (id: string, extra: Partial<AudioTrack> = {}): AudioTrack => ({ id, src: `/${id}.mp3`, title: `Song ${id}`, kind: 'music', ...extra });
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
});

describe('NowPlayingSheet', () => {
  beforeEach(() => { localStorage.clear(); server.playlists = []; });
  afterEach(() => act(() => stopAudio()));

  it('shows the track with controls and the up next list, and closes when playback stops', async () => {
    render(<NowPlayingHost />);
    act(() => playAudio(song('a', { artist: 'Band', origin: 'Mai' }), [song('b'), song('c')]));
    await flush();
    act(() => openNowPlaying());
    const sheet = screen.getByTestId('now-playing');
    expect(within(sheet).getByTestId('now-playing-title')).toHaveTextContent('Song a');
    expect(within(sheet).getByText('Band · from Mai')).toBeInTheDocument();
    expect(within(sheet).getByRole('tab', { name: 'Up next · 2' })).toHaveAttribute('aria-selected', 'true');
    expect(within(sheet).getAllByTestId('audio-queue-item')).toHaveLength(2);
    fireEvent.click(within(sheet).getAllByRole('button', { name: 'Remove from queue' })[0]);
    expect(audioPlayerState().list.map((track) => track.id)).toEqual(['a', 'c']);
    fireEvent.click(within(sheet).getByRole('button', { name: 'Shuffle' }));
    expect(within(sheet).getByRole('button', { name: 'Shuffle' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Repeat off' }));
    expect(within(sheet).getByRole('button', { name: 'Repeat all' })).toBeInTheDocument();
    act(() => stopAudio());
    expect(screen.queryByTestId('now-playing')).not.toBeInTheDocument();
  });

  it('shows the time under the finger while the progress bar is held, and seeks on release', async () => {
    render(<NowPlayingHost />);
    act(() => playAudio(song('a', { duration: 200 })));
    await flush();
    act(() => openNowPlaying());
    const sheet = screen.getByTestId('now-playing');
    const bar = within(sheet).getByTestId('seek-full');
    bar.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 10, right: 200, bottom: 10, x: 0, y: 0, toJSON: () => ({}) });
    expect(within(sheet).getByText('0:00')).toBeInTheDocument();
    fireEvent.pointerDown(bar, { clientX: 100, pointerId: 1 });
    expect(within(sheet).getByText('1:40')).toBeInTheDocument();
    fireEvent.pointerMove(bar, { clientX: 150, pointerId: 1 });
    expect(within(sheet).getByText('2:30')).toBeInTheDocument();
    fireEvent.pointerUp(bar, { clientX: 150, pointerId: 1 });
    expect(audioPlayerState().time).toBe(150);
    expect(within(sheet).getByText('2:30')).toBeInTheDocument();
    fireEvent.pointerDown(bar, { clientX: 20, pointerId: 1 });
    fireEvent.pointerCancel(bar, { pointerId: 1 });
    expect(within(sheet).getByText('2:30')).toBeInTheDocument();
  });

  it('closes with the back button on a phone and keeps the chat open', async () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
    const Back = () => {
      const navigate = useNavigate();
      return <button type="button" onClick={() => navigate(-1)}>system back</button>;
    };
    render(<MemoryRouter initialEntries={['/dm/@mai']}><NowPlayingHost /><Back /></MemoryRouter>);
    act(() => playAudio(song('a')));
    await flush();
    act(() => openNowPlaying());
    expect(screen.getByTestId('now-playing')).toBeInTheDocument();
    act(() => screen.getByText('system back').click());
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
    expect(screen.queryByTestId('now-playing')).not.toBeInTheDocument();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  });

  it('creates a playlist and lists recently played songs', async () => {
    render(<NowPlayingHost />);
    act(() => playAudio(song('a')));
    await flush();
    act(() => openNowPlaying());
    fireEvent.click(screen.getByRole('tab', { name: 'Playlists' }));
    fireEvent.change(screen.getByLabelText('Playlist name'), { target: { value: 'Evening' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByTestId('playlist-detail')).toHaveTextContent('Evening'));
    expect(server.playlists.map((list) => list.name)).toEqual(['Evening']);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Evening')).toBeInTheDocument();
    act(() => rememberPlayed(song('z', { title: 'Old song' })));
    fireEvent.click(screen.getByRole('tab', { name: 'Recently played' }));
    expect(within(screen.getByTestId('audio-recent')).getByText('Old song')).toBeInTheDocument();
  });

  it('animates out when minimized and unmounts after the exit', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<NowPlayingHost />);
    act(() => playAudio(song('a')));
    await act(async () => { vi.advanceTimersByTime(1); });
    act(() => openNowPlaying());
    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));
    expect(screen.getByTestId('now-playing')).toHaveAttribute('data-closing', 'true');
    expect(screen.getByTestId('now-playing')).toHaveClass('is-closing');
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByTestId('now-playing')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('collapses the cover into a compact header while scrolling', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    render(<NowPlayingHost />);
    act(() => playAudio(song('a')));
    await flush();
    act(() => openNowPlaying());
    const compact = screen.getByTestId('now-playing-compact');
    expect(compact).toHaveAttribute('aria-hidden', 'true');
    const scroller = screen.getByTestId('now-playing-title').parentElement!.parentElement!;
    scroller.scrollTop = 260;
    fireEvent.scroll(scroller);
    act(() => frames.splice(0).forEach((frame) => frame(0)));
    expect(screen.getByTestId('now-playing').style.getPropertyValue('--p')).toBe('1.000');
    expect(compact).toHaveAttribute('aria-hidden', 'false');
    vi.unstubAllGlobals();
  });
});
