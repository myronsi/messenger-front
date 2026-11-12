import { fireEvent, render, screen } from '@testing-library/react';
import { longPress } from '@/test/longPress';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GroupChatHeader from './GroupChatHeader';
import type { GroupTranslations } from './groupChatTypes';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: { search: 'Search', back: 'Back' } }) }));

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

it('shows a lowercase participant count with the right plural form', () => {
  const translations = { participantsCountOne: '{count} participant', participantsCountOther: '{count} participants' } as GroupTranslations;
  const { rerender } = render(<GroupChatHeader name="Team" avatar="/a.png" participantCount={1} translations={translations} onBack={vi.fn()} onOpenProfile={vi.fn()} />);
  expect(screen.getByText('1 participant')).toBeInTheDocument();
  rerender(<GroupChatHeader name="Team" avatar="/a.png" participantCount={4} description="Weekly sync" translations={translations} onBack={vi.fn()} onOpenProfile={vi.fn()} />);
  expect(screen.getByText('4 participants - Weekly sync')).toBeInTheDocument();
});

it('shows no participant count until the group details are loaded', () => {
  const translations = { participantsCountOne: '{count} participant', participantsCountOther: '{count} participants' } as GroupTranslations;
  render(<GroupChatHeader name="Team" avatar="/a.png" description="Weekly sync" translations={translations} onBack={vi.fn()} onOpenProfile={vi.fn()} />);
  expect(screen.queryByText(/participants?/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Weekly sync/)).not.toBeInTheDocument();
});
