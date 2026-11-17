import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { audioLibrary, audioPlayerState, playAudio, rememberPlayed, stopAudio, type AudioTrack } from '@/entities/message';
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

const song = (id: string, extra: Partial<AudioTrack> = {}): AudioTrack => ({ id, src: `/${id}.mp3`, title: `Song ${id}`, kind: 'music', ...extra });
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
});

describe('NowPlayingSheet', () => {
  beforeEach(() => localStorage.clear());
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

  it('creates a playlist and lists recently played songs', async () => {
    render(<NowPlayingHost />);
    act(() => playAudio(song('a')));
    await flush();
    act(() => openNowPlaying());
    fireEvent.click(screen.getByRole('tab', { name: 'Playlists' }));
    fireEvent.change(screen.getByLabelText('Playlist name'), { target: { value: 'Evening' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByTestId('playlist-detail')).toHaveTextContent('Evening');
    expect(audioLibrary().playlists.map((list) => list.name)).toEqual(['Evening']);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Evening')).toBeInTheDocument();
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
