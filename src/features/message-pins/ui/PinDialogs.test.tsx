import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { PinnedMessage } from '@/entities/message';
import { PinScopeDialog } from './PinScopeDialog';
import { UnpinDialog } from './UnpinDialog';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));

const buttons = () => screen.getAllByRole('button').map((button) => button.textContent);
const pin = (scope: PinnedMessage['scope'], canUnpinForEveryone: boolean): PinnedMessage => ({
  message: { id: '10', sender: 'Anna', content: 'hi', timestamp: '', type: 'message', read_by: [] },
  scope, pinned_by: '2', pinned_at: '2026-11-21T10:00:00Z', can_unpin_for_everyone: canUnpinForEveryone,
});

describe('PinScopeDialog', () => {
  it('asks with one checked box for the other person in a one-on-one chat', () => {
    const onPin = vi.fn();
    render(<PinScopeDialog context={{ kind: 'direct', peerName: 'Anna', personalOnly: false }} onPin={onPin} onCancel={vi.fn()} />);
    expect(buttons()).toEqual(['Cancel', 'Pin']);
    expect(screen.getByRole('checkbox', { name: 'Also pin for Anna' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(onPin).toHaveBeenCalledWith('everyone');
  });

  it('pins only for me when group staff clear the box', () => {
    const onPin = vi.fn();
    render(<PinScopeDialog context={{ kind: 'group', role: 'moderator' }} onPin={onPin} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pin for everyone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(onPin).toHaveBeenCalledWith('me');
  });

  it('cancels', () => {
    const onCancel = vi.fn();
    render(<PinScopeDialog context={{ kind: 'group', role: 'owner' }} onPin={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('UnpinDialog', () => {
  it('names the other person in a one-on-one chat', () => {
    const onUnpin = vi.fn();
    render(<UnpinDialog pin={pin('everyone', true)} peerName="Anna" onUnpin={onUnpin} onCancel={vi.fn()} />);
    expect(buttons()).toEqual(['Cancel', 'Unpin']);
    expect(screen.getByRole('checkbox', { name: 'Also unpin for Anna' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }));
    expect(onUnpin).toHaveBeenCalledWith('everyone');
  });

  it('unpins only for me in a group when the box is cleared', () => {
    const onUnpin = vi.fn();
    render(<UnpinDialog pin={pin('everyone', true)} onUnpin={onUnpin} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unpin for everyone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }));
    expect(onUnpin).toHaveBeenCalledWith('me');
  });

  it('shows no box and unpins for me when the rank does not allow more', () => {
    const onUnpin = vi.fn();
    render(<UnpinDialog pin={pin('everyone', false)} onUnpin={onUnpin} onCancel={vi.fn()} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('The others still see it pinned.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }));
    expect(onUnpin).toHaveBeenCalledWith('me');
  });
});
