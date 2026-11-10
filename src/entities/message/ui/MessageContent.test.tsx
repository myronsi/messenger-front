import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileText } from 'lucide-react';
import { en } from '@/shared/lang/en';
import type { FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import type { Message, MessageAttachment } from '../model/types';
import MessageContent from './MessageContent';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('./AudioMessage', () => ({ default: ({ fileUrl }: { fileUrl: string }) => <div data-testid="audio-player">{fileUrl}</div> }));
vi.mock('./ImageMessage', () => ({
  default: ({ isVideo, uploadProgress }: { isVideo?: boolean; uploadProgress?: number }) => (
    <div data-testid={isVideo ? 'video-tile' : 'image-tile'} data-progress={uploadProgress} />
  ),
}));

const pdfConfig: FileTypeConfig = { extensions: ['.pdf'], icon: FileText, onHover: FileText, replyText: en.pdfDocument };

const fileMessage = (attachment: Partial<MessageAttachment>, extra: Partial<Message> = {}): Message => ({
  id: '5', sender: 'ann', sender_id: '2', timestamp: '2026-11-10T10:00:00Z', type: 'file', read_by: [],
  content: { file_url: '/api/v2/attachments/a/content', file_name: 'a.bin', file_type: 'application/octet-stream', file_size: 10, ...attachment },
  ...extra,
});

const renderContent = (message: Message, getFileTypeConfig: (name: string) => FileTypeConfig | undefined = () => undefined) => render(
  <MessageContent message={message} isMobile={false} translations={en} getFileTypeConfig={getFileTypeConfig} isOwnMessage={() => false}
    renderMessageContent={() => ''} isAudioPlaying={false} setPlayingMessageId={vi.fn()} />,
);

describe('MessageContent attachments', () => {
  it('plays a wav sent as kind audio and names the file', () => {
    renderContent(fileMessage({ kind: 'audio', file_name: 'take.wav', file_type: 'audio/wave' }));
    expect(screen.getByTestId('audio-player')).toBeInTheDocument();
    expect(screen.getByTestId('audio-file-name')).toHaveTextContent('take.wav');
  });

  it('plays audio-only webm instead of showing a video tile', () => {
    renderContent(fileMessage({ kind: 'audio', file_name: 'memo.webm', file_type: 'audio/webm' }));
    expect(screen.getByTestId('audio-player')).toBeInTheDocument();
    expect(screen.queryByTestId('video-tile')).not.toBeInTheDocument();
  });

  it('shows a video tile for kind video only', () => {
    renderContent(fileMessage({ kind: 'video', file_name: 'clip.webm', file_type: 'video/webm' }));
    expect(screen.getByTestId('video-tile')).toBeInTheDocument();
  });

  it('shows a voice message without a file name', () => {
    renderContent(fileMessage({ kind: 'voice', file_name: 'voice.ogg', file_type: 'voice' }));
    expect(screen.getByTestId('audio-player')).toBeInTheDocument();
    expect(screen.queryByTestId('audio-file-name')).not.toBeInTheDocument();
  });

  it('shows a file with its size and a generic icon for unknown types', () => {
    renderContent(fileMessage({ kind: 'file', file_name: 'data.json', file_size: 2.5 * 1024 * 1024 }));
    expect(screen.getByText('data.json')).toBeInTheDocument();
    expect(screen.getByTestId('file-size')).toHaveTextContent('2.5 MB');
  });

  it('shows upload progress on files and images while they upload', () => {
    const uploading = { upload_status: 'uploading' as const, upload_progress: 42 };
    renderContent(fileMessage({ kind: 'file', file_name: 'doc.pdf' }, uploading), () => pdfConfig);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('Uploading: 42%');
    renderContent(fileMessage({ kind: 'image', file_name: 'photo.png', file_type: 'image/png' }, uploading));
    expect(screen.getByTestId('image-tile')).toHaveAttribute('data-progress', '42');
  });

  it('shows no progress once the upload is done', () => {
    renderContent(fileMessage({ kind: 'file', file_name: 'doc.pdf' }, { upload_progress: 99 }), () => pdfConfig);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
