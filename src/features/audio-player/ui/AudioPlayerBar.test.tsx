import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioPlayerState } from '@/entities/message';
import { AudioPlayerBar } from './AudioPlayerBar';

let player: AudioPlayerState;
const calls = vi.hoisted(() => ({
  toggleAudio: vi.fn(), stopAudio: vi.fn(), playNextAudio: vi.fn(), playPreviousAudio: vi.fn(), seekAudio: vi.fn(), openNowPlaying: vi.fn(),
}));
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ translations: en }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} data-testid="cover" /> }));
vi.mock('../model/nowPlaying', () => ({ openNowPlaying: calls.openNowPlaying }));
vi.mock('@/entities/message', async () => {
  const actions = await vi.importActual<typeof import('@/entities/message')>('@/entities/message');
  return {
    useAudioPlayer: <T,>(select: (state: AudioPlayerState) => T) => select(player),
    usePlaybackSpeed: () => 1,
    nextPlaybackSpeed: vi.fn(),
    audioPosition: () => player.time,
    formatAudioTime: (seconds: number) => `0:${String(Math.floor(seconds)).padStart(2, '0')}`,
    trackSubtitle: actions.trackSubtitle,
    ...calls,
  };
});

const song = { id: '9', src: '/s.mp3', title: 'Kick Remix', kind: 'music' as const, artist: 'DJ', origin: 'Mai', cover: '/c.jpg' };

describe('AudioPlayerBar', () => {
  beforeEach(() => {
    Object.values(calls).forEach((fn) => fn.mockReset());
    player = { track: null, list: [], index: -1, playing: false, loading: false, error: false, time: 0, duration: 0, shuffle: false, repeat: 'off' };
  });

  it('stays hidden while nothing plays', () => {
    render(<AudioPlayerBar />);
    expect(screen.queryByTestId('audio-player-bar')).not.toBeInTheDocument();
  });

  it('shows cover, title, artist and origin, and controls playback', () => {
    player = { ...player, track: song, list: [song], index: 0, time: 5, duration: 40 };
    render(<AudioPlayerBar />);
    expect(screen.getByText('Kick Remix')).toBeInTheDocument();
    expect(screen.getByText('DJ · from Mai')).toBeInTheDocument();
    expect(screen.getByTestId('cover')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(calls.toggleAudio).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(calls.playPreviousAudio).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close player' }));
    expect(calls.stopAudio).toHaveBeenCalled();
  });

  it('allows next at the end when the queue repeats', () => {
    player = { ...player, track: song, list: [song, { ...song, id: '10' }], index: 1, repeat: 'all' };
    render(<AudioPlayerBar />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('seeks from the progress line', () => {
    player = { ...player, track: song, list: [song], index: 0, time: 0, duration: 100 };
    render(<AudioPlayerBar />);
    const seek = screen.getByRole('slider', { name: 'Position' });
    seek.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 10, right: 200, bottom: 10, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(seek, { clientX: 50, pointerId: 1 });
    fireEvent.pointerUp(seek, { clientX: 50, pointerId: 1 });
    expect(calls.seekAudio).toHaveBeenCalledWith(25);
    fireEvent.keyDown(seek, { key: 'ArrowRight' });
    expect(calls.seekAudio).toHaveBeenLastCalledWith(5);
  });

  it('opens the full player on tap', () => {
    player = { ...player, track: song, list: [song], index: 0 };
    render(<AudioPlayerBar />);
    fireEvent.click(screen.getByTestId('audio-player-title'));
    expect(calls.openNowPlaying).toHaveBeenCalledTimes(1);
  });

  it('draws custom emoji in the names instead of the raw token', () => {
    const named = { ...song, artist: undefined, origin: 'Myron <a:img_7327:2>' };
    player = { ...player, track: named, list: [named], index: 0 };
    render(<AudioPlayerBar />);
    expect(screen.getByTestId('audio-player-bar')).not.toHaveTextContent('<a:');
    expect(screen.getByAltText(':img_7327:')).toBeInTheDocument();
  });

  it('slides closed with the last song before it disappears', () => {
    vi.useFakeTimers();
    player = { ...player, track: song, list: [song], index: 0 };
    const { rerender } = render(<AudioPlayerBar />);
    const bar = screen.getByTestId('audio-player-bar');
    expect(bar).toHaveClass('mini-player');
    expect(bar).not.toHaveAttribute('data-closing');
    player = { ...player, track: null, list: [], index: -1 };
    rerender(<AudioPlayerBar />);
    expect(screen.getByTestId('audio-player-bar')).toHaveAttribute('data-closing', 'true');
    expect(screen.getByTestId('audio-player-bar')).toHaveClass('is-closing');
    expect(screen.getByText('Kick Remix')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByTestId('audio-player-bar')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('clips its content only while it is still opening', () => {
    vi.useFakeTimers();
    player = { ...player, track: song, list: [song], index: 0 };
    render(<AudioPlayerBar />);
    const inner = screen.getByTestId('audio-player-bar').firstElementChild as HTMLElement;
    expect(inner).toHaveClass('overflow-hidden');
    act(() => { vi.advanceTimersByTime(400); });
    expect(inner).not.toHaveClass('overflow-hidden');
    vi.useRealTimers();
  });
});
