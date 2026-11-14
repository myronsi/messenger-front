import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioPlayerState } from '@/entities/message';
import { AudioPlayerBar } from './AudioPlayerBar';

let player: AudioPlayerState;
const toggleAudio = vi.fn();
const stopAudio = vi.fn();
const playNextAudio = vi.fn();
const playPreviousAudio = vi.fn();
const playAudioAt = vi.fn();
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ translations: en }) };
});
vi.mock('@/entities/message', () => ({
  useAudioPlayer: <T,>(select: (state: AudioPlayerState) => T) => select(player),
  usePlaybackSpeed: () => 1,
  nextPlaybackSpeed: vi.fn(),
  audioPosition: () => player.time,
  formatAudioTime: (seconds: number) => `0:${String(Math.floor(seconds)).padStart(2, '0')}`,
  toggleAudio: () => toggleAudio(),
  stopAudio: () => stopAudio(),
  playNextAudio: () => playNextAudio(),
  playPreviousAudio: () => playPreviousAudio(),
  playAudioAt: (index: number) => playAudioAt(index),
  moveAudioTrack: vi.fn(),
}));

describe('AudioPlayerBar', () => {
  beforeEach(() => {
    player = { track: null, list: [], index: -1, playing: false, loading: false, error: false, time: 0, duration: 0 };
  });

  it('stays hidden while nothing plays', () => {
    render(<AudioPlayerBar />);
    expect(screen.queryByTestId('audio-player-bar')).not.toBeInTheDocument();
  });

  it('shows the current track and controls it', () => {
    player = { ...player, track: { id: '9', src: '/s.mp3', title: 'Kick Remix.mp3', kind: 'music' }, playing: false, time: 5, duration: 40 };
    render(<AudioPlayerBar />);
    expect(screen.getByText('Kick Remix.mp3')).toBeInTheDocument();
    expect(screen.getByText('0:05 / 0:40')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(toggleAudio).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Close player' }));
    expect(stopAudio).toHaveBeenCalledOnce();
  });

  it('goes to the next or previous track when the bar is swiped', () => {
    const song = { id: '9', src: '/s.mp3', title: 'Kick Remix.mp3', kind: 'music' as const };
    player = { ...player, track: song, list: [song], index: 0 };
    render(<AudioPlayerBar />);
    const title = screen.getByTestId('audio-player-title');
    fireEvent.pointerDown(title, { clientX: 200 });
    fireEvent.pointerMove(title, { clientX: 120 });
    fireEvent.pointerUp(title, { clientX: 120 });
    fireEvent.click(title);
    expect(playNextAudio).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('audio-queue')).not.toBeInTheDocument();
    fireEvent.pointerDown(title, { clientX: 100 });
    fireEvent.pointerMove(title, { clientX: 180 });
    fireEvent.pointerUp(title, { clientX: 180 });
    expect(playPreviousAudio).toHaveBeenCalledOnce();
  });

  it('opens the playlist with played, current and next tracks and plays a tapped one', () => {
    const tracks = ['a', 'b', 'c'].map((id) => ({ id, src: `/${id}.mp3`, title: `${id}.mp3`, kind: 'music' as const }));
    player = { ...player, track: tracks[1], list: tracks, index: 1, playing: true };
    render(<AudioPlayerBar />);
    fireEvent.click(screen.getByTestId('audio-player-title'));
    expect(screen.getAllByTestId('audio-queue-item').map((item) => item.dataset.state)).toEqual(['played', 'current', 'next']);
    fireEvent.click(screen.getByRole('button', { name: 'c.mp3' }));
    expect(playAudioAt).toHaveBeenCalledWith(2);
  });
});
