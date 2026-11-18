import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import ChatRequestBanner from './ChatRequestBanner';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));

describe('ChatRequestBanner', () => {
  it('shows who wrote and offers Accept, Delete and Block', () => {
    const request = { busy: false, accept: vi.fn(), remove: vi.fn(), block: vi.fn() };
    const onOpenProfile = vi.fn();
    render(<ChatRequestBanner request={request} chatName="stranger" displayName="Sam Stranger" avatar="" translations={en} onOpenProfile={onOpenProfile} />);
    expect(screen.getByText('@stranger')).toBeInTheDocument();
    expect(screen.getByTestId('chat-request-banner')).toHaveTextContent('Sam Stranger wants to chat with you');
    fireEvent.click(screen.getByRole('button', { name: en.chatOrganizer.acceptRequest }));
    fireEvent.click(screen.getByRole('button', { name: en.chatOrganizer.deleteRequest }));
    fireEvent.click(screen.getByRole('button', { name: en.chatOrganizer.blockRequest }));
    fireEvent.click(screen.getByText('@stranger'));
    expect(request.accept).toHaveBeenCalledTimes(1);
    expect(request.remove).toHaveBeenCalledTimes(1);
    expect(request.block).toHaveBeenCalledTimes(1);
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });

  it('disables the actions while one runs', () => {
    render(<ChatRequestBanner request={{ busy: true, accept: vi.fn(), remove: vi.fn(), block: vi.fn() }} chatName="s" displayName="S" avatar="" translations={en} onOpenProfile={vi.fn()} />);
    expect(screen.getByRole('button', { name: en.chatOrganizer.acceptRequest })).toBeDisabled();
  });
});
