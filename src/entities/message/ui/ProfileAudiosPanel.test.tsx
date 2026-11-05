import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ProfileAudiosPanel, type ProfileAudioItem } from './ProfileChatPanels';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: { replyFromYou: 'You', showInChat: 'Show in chat' } }) }));
interface PlayerProps { messageId: string; isPlaying: boolean; isMine: boolean; setPlayingMessageId: (id: string | null, ended?: string) => void }

vi.mock('./AudioMessage', () => ({
  default: ({ messageId, isPlaying, isMine, setPlayingMessageId }: PlayerProps) => (
    <div data-testid={`player-${messageId}`} data-playing={isPlaying} data-mine={isMine}>
      <button type="button" onClick={() => setPlayingMessageId(messageId)}>play {messageId}</button>
      <button type="button" onClick={() => setPlayingMessageId(null, messageId)}>end {messageId}</button>
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

  fireEvent.click(screen.getByText('play 2'));
  expect(screen.getByTestId('player-2')).toHaveAttribute('data-playing', 'true');
  fireEvent.click(screen.getByText('end 2'));
  expect(screen.getByTestId('player-1')).toHaveAttribute('data-playing', 'true');
  expect(screen.getByTestId('player-2')).toHaveAttribute('data-playing', 'false');
});

it('jumps to the audio message in the chat', () => {
  const onJump = vi.fn();
  render(<ProfileAudiosPanel audios={audios} currentUsername="Me" onJumpToMessage={onJump} />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Show in chat' })[1]);
  expect(onJump).toHaveBeenCalledWith('1');
});
