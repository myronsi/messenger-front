import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message } from '../model/types';
import MessageTime from './MessageTime';

const message = (id: Message['id'], extra: Partial<Message> = {}) => ({ id, read_by: [], ...extra }) as unknown as Message;
const renderTime = (value: Message, isUploading = false) => render(
  <MessageTime message={value} time="10:00" isMine isGroup={false} isUploading={isUploading} userId="1" translations={en} />,
);

describe('MessageTime', () => {
  it('shows a pending clock while the message has only a temporary id', () => {
    renderTime(message(-3));
    expect(screen.getByTestId('message-pending')).toBeInTheDocument();
    expect(screen.getByTitle('Sending')).toBeInTheDocument();
  });

  it('shows the sent check once the server id arrives', () => {
    renderTime(message('42'));
    expect(screen.queryByTestId('message-pending')).not.toBeInTheDocument();
    expect(screen.getByTitle('Sent')).toBeInTheDocument();
  });

  it('keeps the upload status for uploads', () => {
    renderTime(message(-3), true);
    expect(screen.queryByTestId('message-pending')).not.toBeInTheDocument();
    expect(screen.getByTitle('Uploading...')).toBeInTheDocument();
  });
});
