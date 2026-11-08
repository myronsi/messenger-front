import { render, screen } from '@testing-library/react';
import { longPress } from '@/test/longPress';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ChatHeader from './ChatHeader';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: { ...en, search: 'Search', back: 'Back' } }) };
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('opens the direct chat search with a long press on the header', () => {
  const onOpenSearch = vi.fn();
  const onOpenProfile = vi.fn();
  render(<ChatHeader chatName="alice" chatDisplayName="Alice" interlocutorDeleted={false} onBack={vi.fn()} onDeleteChat={vi.fn()}
    onOpenProfile={onOpenProfile} onOpenSearch={onOpenSearch} interlocutorAvatar="/a.png" />);
  longPress(screen.getByText('Alice'));
  expect(onOpenSearch).toHaveBeenCalledOnce();
  expect(onOpenProfile).not.toHaveBeenCalled();
});
