import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ProfileAudiosPanel, type ProfileAudioItem } from './ProfileChatPanels';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: { replyFromYou: 'You', showInChat: 'Show in chat' } }) }));
interface PlayerProps { messageId: string; isMine: boolean; variant: string; onPlay: () => void }

const playAudio = vi.fn();
vi.mock('../model/audioPlayer', () => ({ playAudio: (...args: unknown[]) => playAudio(...args) }));
vi.mock('./AudioMessage', () => ({
  default: ({ messageId, isMine, variant, onPlay }: PlayerProps) => (
    <div data-testid={`player-${messageId}`} data-mine={isMine} data-variant={variant}>
      <button type="button" onClick={() => onPlay()}>play {messageId}</button>
    </div>
  ),
}));

const audios: ProfileAudioItem[] = [
  { id: '2', url: '/b', name: 'voice.opus', kind: 'voice', timestamp: '2024-03-01T10:00:00Z', sender: 'Anna', senderUsername: 'anna' },
  { id: '1', url: '/a', name: 'song.mp3', kind: 'file', timestamp: '2024-02-01T10:00:00Z', sender: 'Me', senderUsername: 'me' },
];

it('shows each audio as a chat bubble with sender and date, and plays the next one after the end', () => {
  render(<ProfileAudiosPanel audios={audios} currentUsername="Me" />);
  expect(screen.getAllByTestId('profile-audio')).toHaveLength(2);
  expect(screen.getByTestId('player-1')).toHaveAttribute('data-mine', 'true');
  expect(screen.getByTestId('player-2')).toHaveAttribute('data-mine', 'false');
  expect(screen.getByText('song.mp3')).toBeInTheDocument();
  expect(screen.queryByText('voice.opus')).not.toBeInTheDocument();
  expect(screen.getByText(/^Anna · 1 March 2024/)).toBeInTheDocument();
  expect(screen.getByText(/^You · 1 February 2024/)).toBeInTheDocument();

  expect(screen.getByTestId('player-1')).toHaveAttribute('data-variant', 'music');
  expect(screen.getByTestId('player-2')).toHaveAttribute('data-variant', 'voice');
});

it('plays through the shared player and queues only the following audios of the same kind', () => {
  const more: ProfileAudioItem[] = [
    { id: '3', url: '/c', name: 'one.mp3', kind: 'file', timestamp: '2024-04-01T10:00:00Z', sender: 'Anna' },
    ...audios,
    { id: '0', url: '/d', name: 'two.mp3', kind: 'file', timestamp: '2024-01-01T10:00:00Z', sender: 'Anna' },
  ];
  playAudio.mockClear();
  render(<ProfileAudiosPanel audios={more} currentUsername="Me" />);
  fireEvent.click(screen.getByText('play 3'));
  expect(playAudio).toHaveBeenCalledWith(
    expect.objectContaining({ id: '3', src: '/c', title: 'one.mp3', kind: 'music' }),
    [expect.objectContaining({ id: '1' }), expect.objectContaining({ id: '0' })],
    undefined,
  );
});

it('jumps to the audio message in the chat', () => {
  const onJump = vi.fn();
  render(<ProfileAudiosPanel audios={audios} currentUsername="Me" onJumpToMessage={onJump} />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Show in chat' })[1]);
  expect(onJump).toHaveBeenCalledWith('1');
});
