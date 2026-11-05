import { fireEvent, render, screen } from '@testing-library/react';
import { longPress } from '@/test/longPress';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GroupChatHeader from './GroupChatHeader';
import type { GroupTranslations } from './groupChatTypes';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: { search: 'Search', back: 'Back' } }) }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('opens the group search with a long press on the header without opening the profile', () => {
  const onOpenSearch = vi.fn();
  const onOpenProfile = vi.fn();
  render(<GroupChatHeader name="Team" avatar="/a.png" participantCount={3} translations={{ search: 'Search' } as GroupTranslations}
    onBack={vi.fn()} onOpenProfile={onOpenProfile} onOpenSearch={onOpenSearch} />);
  longPress(screen.getByText('Team'));
  expect(onOpenSearch).toHaveBeenCalledOnce();
  expect(onOpenProfile).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Team'));
  expect(onOpenProfile).toHaveBeenCalledOnce();
});
