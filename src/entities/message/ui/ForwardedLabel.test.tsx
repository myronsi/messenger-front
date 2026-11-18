import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import ForwardedLabel from './ForwardedLabel';

const getUser = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api/client', () => ({ apiClient: { GET: getUser } }));

describe('ForwardedLabel', () => {
  it('names the original sender in bold', () => {
    render(<ForwardedLabel forwardedFrom={{ message_id: '1', sender_name: 'Myrron' }} translations={en} isMine={false} isImage={false} />);
    expect(screen.getByTestId('forwarded-label')).toHaveTextContent('Forwarded from Myrron');
    expect(screen.getByText('Myrron')).toHaveClass('font-semibold');
  });

  it('keeps its distance from the image edge', () => {
    render(<ForwardedLabel forwardedFrom={{ message_id: '1', sender_name: 'Myrron' }} translations={en} isMine isImage />);
    expect(screen.getByTestId('forwarded-label')).toHaveClass('px-3');
  });

  it('falls back to the deleted user name', () => {
    render(<ForwardedLabel forwardedFrom={{ message_id: '1' }} translations={en} isMine={false} isImage={false} />);
    expect(screen.getByText(en.deletedUser)).toBeInTheDocument();
  });

  it('links the name to the profile when the original sender allows it', async () => {
    getUser.mockResolvedValue({ data: { id: '5', username: 'myrron', is_deleted: false }, response: new Response(null, { status: 200 }) });
    const onOpenSender = vi.fn();
    render(<ForwardedLabel forwardedFrom={{ message_id: '1', sender_id: '5', sender_name: 'Myrron' }} translations={en} isMine={false} isImage={false}
      onOpenSender={onOpenSender} />);
    fireEvent.click(screen.getByTestId('forwarded-sender-link'));
    await waitFor(() => expect(onOpenSender).toHaveBeenCalledWith('myrron'));
    expect(getUser).toHaveBeenCalledWith('/users/{user_id}', { params: { path: { user_id: '5' } } });
  });

  it('shows the name as plain text when the server hides the sender', () => {
    render(<ForwardedLabel forwardedFrom={{ message_id: '1', sender_id: null, sender_name: 'Myrron' }} translations={en} isMine={false} isImage={false}
      onOpenSender={vi.fn()} />);
    expect(screen.queryByTestId('forwarded-sender-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('forwarded-sender-name')).toHaveTextContent('Myrron');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
