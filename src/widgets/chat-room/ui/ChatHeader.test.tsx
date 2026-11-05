import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ChatHeader from './ChatHeader';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: { search: 'Search', back: 'Back' } }) }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const longPress = (element: HTMLElement) => {
  fireEvent.touchStart(element, { touches: [{ clientX: 10, clientY: 10 }] });
  act(() => { vi.advanceTimersByTime(500); });
  fireEvent.touchEnd(element);
  fireEvent.click(element);
};

it('opens the direct chat search with a long press on the header', () => {
  const onOpenSearch = vi.fn();
  const onOpenProfile = vi.fn();
  render(<ChatHeader chatName="alice" chatDisplayName="Alice" interlocutorDeleted={false} onBack={vi.fn()} onDeleteChat={vi.fn()}
    onOpenProfile={onOpenProfile} onOpenSearch={onOpenSearch} interlocutorAvatar="/a.png" />);
  longPress(screen.getByText('Alice'));
  expect(onOpenSearch).toHaveBeenCalledOnce();
  expect(onOpenProfile).not.toHaveBeenCalled();
});
