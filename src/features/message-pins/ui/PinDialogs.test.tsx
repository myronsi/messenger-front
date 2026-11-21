import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { PinnedMessage } from '@/entities/message';
import { PinScopeDialog } from './PinScopeDialog';
import { UnpinDialog } from './UnpinDialog';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));

const choices = () => screen.getAllByRole('button').map((button) => button.textContent);
const pin = (scope: PinnedMessage['scope'], canUnpinForEveryone: boolean): PinnedMessage => ({
  message: { id: '10', sender: 'Anna', content: 'hi', timestamp: '', type: 'message', read_by: [] },
  scope, pinned_by: '2', pinned_at: '2026-11-21T10:00:00Z', can_unpin_for_everyone: canUnpinForEveryone,
});

describe('PinScopeDialog', () => {
  it('offers me and the other person in a one-on-one chat', () => {
    const onPin = vi.fn();
    render(<PinScopeDialog context={{ kind: 'direct', peerName: 'Anna', personalOnly: false }} onPin={onPin} onCancel={vi.fn()} />);
    expect(choices()).toEqual(['Pin for me', 'Pin for me and Anna', 'Cancel']);
    fireEvent.click(screen.getByRole('button', { name: 'Pin for me and Anna' }));
    expect(onPin).toHaveBeenCalledWith('everyone');
  });

  it('offers everyone to group staff', () => {
    const onPin = vi.fn();
    render(<PinScopeDialog context={{ kind: 'group', role: 'moderator' }} onPin={onPin} onCancel={vi.fn()} />);
    expect(choices()).toEqual(['Pin for me', 'Pin for everyone', 'Cancel']);
    fireEvent.click(screen.getByRole('button', { name: 'Pin for me' }));
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
  it('says both in a one-on-one chat', () => {
    const onUnpin = vi.fn();
    render(<UnpinDialog pin={pin('everyone', true)} direct onUnpin={onUnpin} onCancel={vi.fn()} />);
    expect(choices()).toEqual(['Unpin for me', 'Unpin for both', 'Cancel']);
    fireEvent.click(screen.getByRole('button', { name: 'Unpin for both' }));
    expect(onUnpin).toHaveBeenCalledWith('everyone');
  });

  it('says everyone in a group when the rank allows it', () => {
    render(<UnpinDialog pin={pin('everyone', true)} direct={false} onUnpin={vi.fn()} onCancel={vi.fn()} />);
    expect(choices()).toEqual(['Unpin for me', 'Unpin for everyone', 'Cancel']);
  });

  it('offers only unpin for me when the rank does not allow more', () => {
    const onUnpin = vi.fn();
    render(<UnpinDialog pin={pin('everyone', false)} direct={false} onUnpin={onUnpin} onCancel={vi.fn()} />);
    expect(choices()).toEqual(['Unpin for me', 'Cancel']);
    fireEvent.click(screen.getByRole('button', { name: 'Unpin for me' }));
    expect(onUnpin).toHaveBeenCalledWith('me');
  });
});
