import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import ChatRequestBanner from './ChatRequestBanner';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
vi.mock('@/entities/user', () => ({ useGetUserByUsernameQuery: () => ({ data: { id: '42' } }) }));
vi.mock('@/features/moderation', () => ({
  ReportUserDialog: ({ userId, onReported, onClose }: { userId: string; onReported: (blocked: boolean) => void; onClose: () => void }) => (
    <div data-testid="report-dialog" data-user={userId}>
      <button type="button" onClick={() => { onReported(true); onClose(); }}>report and block</button>
      <button type="button" onClick={() => { onReported(false); onClose(); }}>report only</button>
    </div>
  ),
}));

const setup = () => {
  const request = { busy: false, accept: vi.fn(), remove: vi.fn(), block: vi.fn() };
  const onOpenProfile = vi.fn();
  render(<ChatRequestBanner request={request} chatName="stranger" displayName="Sam Stranger" avatar="" translations={en} onOpenProfile={onOpenProfile} />);
  return { request, onOpenProfile };
};

describe('ChatRequestBanner', () => {
  it('shows who wrote and offers Accept, Delete and Report and block', () => {
    const { request, onOpenProfile } = setup();
    expect(screen.getByText('@stranger')).toBeInTheDocument();
    expect(screen.getByTestId('chat-request-banner')).toHaveTextContent('Sam Stranger wants to chat with you');
    fireEvent.click(screen.getByRole('button', { name: en.chatOrganizer.acceptRequest }));
    fireEvent.click(screen.getByRole('button', { name: en.chatOrganizer.deleteRequest }));
    fireEvent.click(screen.getByText('@stranger'));
    expect(request.accept).toHaveBeenCalledTimes(1);
    expect(request.remove).toHaveBeenCalledTimes(1);
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });

  it('reports the sender and then blocks and leaves the request', () => {
    const { request } = setup();
    fireEvent.click(screen.getByRole('button', { name: en.chatOrganizer.reportAndBlockRequest }));
    expect(screen.getByTestId('report-dialog')).toHaveAttribute('data-user', '42');
    fireEvent.click(screen.getByText('report and block'));
    expect(request.block).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('report-dialog')).not.toBeInTheDocument();
  });

  it('keeps the request when the report does not block', () => {
    const { request } = setup();
    fireEvent.click(screen.getByRole('button', { name: en.chatOrganizer.reportAndBlockRequest }));
    fireEvent.click(screen.getByText('report only'));
    expect(request.block).not.toHaveBeenCalled();
    expect(request.remove).not.toHaveBeenCalled();
  });

  it('disables the actions while one runs', () => {
    render(<ChatRequestBanner request={{ busy: true, accept: vi.fn(), remove: vi.fn(), block: vi.fn() }} chatName="s" displayName="S" avatar="" translations={en} onOpenProfile={vi.fn()} />);
    expect(screen.getByRole('button', { name: en.chatOrganizer.acceptRequest })).toBeDisabled();
    expect(screen.getByRole('button', { name: en.chatOrganizer.reportAndBlockRequest })).toBeDisabled();
  });
});
