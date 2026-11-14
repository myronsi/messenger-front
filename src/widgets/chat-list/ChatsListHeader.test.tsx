import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import ChatsListHeader from './ChatsListHeader';

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => mobile.value }));
const touch = vi.hoisted(() => ({ value: false }));
vi.mock('@/shared/hooks/useCanScanQr', () => ({ useCanScanQr: () => touch.value }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => null }));

const t = en.appShell;
const setup = () => {
  const handlers = { onOpenSearch: vi.fn(), onNewGroup: vi.fn(), onScanQr: vi.fn() };
  render(<ChatsListHeader translations={en} {...handlers} />);
  return handlers;
};

describe('ChatsListHeader', () => {
  beforeEach(() => { mobile.value = false; touch.value = false; });

  it('uses the shared tab header with the Chats title and no avatar button', () => {
    setup();
    expect(screen.getByTestId('tab-header')).toHaveTextContent(en.chats);
    expect(screen.queryByRole('button', { name: t.openSettings })).not.toBeInTheDocument();
  });

  it('offers new chat and new group but no QR scanner from the New menu on desktop', async () => {
    const handlers = setup();
    fireEvent.keyDown(screen.getByRole('button', { name: t.newMenuLabelNoQr }), { key: 'Enter' });
    expect(await screen.findByRole('menuitem', { name: new RegExp(t.newChat) })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: new RegExp(t.scanQr) })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(t.newGroup) }));
    expect(handlers.onNewGroup).toHaveBeenCalledOnce();
    fireEvent.keyDown(screen.getByRole('button', { name: t.newMenuLabelNoQr }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(t.newChat) }));
    expect(handlers.onOpenSearch).toHaveBeenCalledOnce();
  });

  it('offers the QR scanner on touch devices', async () => {
    touch.value = true;
    const handlers = setup();
    fireEvent.keyDown(screen.getByRole('button', { name: t.newMenuLabel }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(t.scanQr) }));
    expect(handlers.onScanQr).toHaveBeenCalledOnce();
  });

  it('uses a round New button on phones', () => {
    mobile.value = true;
    touch.value = true;
    setup();
    const button = screen.getByRole('button', { name: t.newMenuLabel });
    expect(button).not.toHaveTextContent(t.newAction);
  });
});
