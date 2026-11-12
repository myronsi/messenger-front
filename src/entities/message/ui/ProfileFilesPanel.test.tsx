import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { ProfileFilesPanel } from './ProfileFilesPanel';

vi.mock('@/shared/lib/downloadFile', () => ({ downloadFile: vi.fn() }));

const files = [
  { id: '12', file_url: '/media/a1', file_name: 'route.zip', file_size: 2048, caption: 'Offline maps', sender: 'Nina', sender_username: 'nina',
    timestamp: '2026-11-12T09:00:00Z' },
  { id: '13', file_url: '/media/a2', file_name: 'notes.txt', file_size: 92, sender: 'Me', sender_username: 'me', timestamp: '2026-11-12T10:00:00Z' },
];

beforeEach(() => localStorage.setItem('language', 'en'));

describe('ProfileFilesPanel', () => {
  it('lists files with sender, caption and a jump to the message', () => {
    const onJump = vi.fn();
    render(<LanguageProvider><ProfileFilesPanel files={files} currentUsername="me" onJumpToMessage={onJump} /></LanguageProvider>);
    expect(screen.getAllByTestId('profile-file')).toHaveLength(2);
    expect(screen.getByText('route.zip')).toBeInTheDocument();
    expect(screen.getByText('Offline maps')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download: notes.txt' })).toBeInTheDocument();
    expect(screen.getAllByText(/^You ·/)).toHaveLength(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Show in chat' })[0]);
    expect(onJump).toHaveBeenCalledWith('12');
  });

  it('says when the chat has no files', () => {
    render(<LanguageProvider><ProfileFilesPanel files={[]} /></LanguageProvider>);
    expect(screen.getByText('No files in this chat yet.')).toBeInTheDocument();
  });
});
