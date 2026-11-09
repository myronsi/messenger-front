import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '../model/types';
import ReplyPreview from './ReplyPreview';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { replyUnavailable: 'Original message', replyFromYou: 'You', messageDeleted: '[Message deleted]', voiceMessage: 'Voice Message', image: 'Image' } }),
}));
vi.mock('@/shared/contexts/fileTypesConfig', () => ({ useFileTypes: () => ({ getFileTypeConfig: () => null }) }));

const original: Message = { id: '1', sender: 'Mai', content: 'See you tomorrow at the station', timestamp: 't', type: 'message', read_by: [] };

describe('ReplyPreview', () => {
  it('shows who wrote the quoted message and jumps without bubbling to the message', () => {
    const onClick = vi.fn();
    const parent = vi.fn();
    render(<div onClick={parent}><ReplyPreview replyMessage={original} isMine onClick={onClick} /></div>);
    expect(screen.getByText('Mai')).toBeInTheDocument();
    expect(screen.getByText('See you tomorrow at the station')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reply-preview'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(parent).not.toHaveBeenCalled();
  });

  it('shows the drawing on the quoted image', () => {
    const drawing = { version: 1, items: [{ type: 'stroke' as const, color: '#ff0000', width: 0.01, points: [0, 0, 1, 1] }] };
    const photo: Message = {
      ...original, type: 'file',
      content: { file_url: '/a.png', file_name: 'a.png', file_type: 'image/png', file_size: 5, image_width: 400, image_height: 200, drawing },
    };
    render(<ReplyPreview replyMessage={photo} isMine={false} />);
    expect(screen.getByTestId('drawing-overlay')).toHaveAttribute('viewBox', '0 0 1000 500');
  });

  it('shows only the thumbnail and sender for an image without a caption', () => {
    const photo: Message = { ...original, type: 'file', content: { file_url: '/a.png', file_name: 'a.png', file_type: 'image/png', file_size: 5 } };
    render(<ReplyPreview replyMessage={photo} isMine={false} />);
    expect(screen.getByText('Mai')).toBeInTheDocument();
    expect(screen.queryByText('Image')).not.toBeInTheDocument();
  });

  it('says you instead of your own name when the quoted message is yours', () => {
    render(<ReplyPreview replyMessage={original} isMine={false} isReplyToOwn />);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByText('Mai')).not.toBeInTheDocument();
  });

  it('says original message instead of deleted when the quoted message is not loaded', () => {
    render(<ReplyPreview replyMessage={undefined} isMine={false} />);
    expect(screen.getByText('Original message')).toBeInTheDocument();
  });
});
