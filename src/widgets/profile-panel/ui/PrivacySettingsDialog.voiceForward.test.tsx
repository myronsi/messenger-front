import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import PrivacySettingsPanel from './PrivacySettingsDialog';

const handlePrivacyChange = vi.hoisted(() => vi.fn());
const empty = { allow: [], deny: [] };
const exceptionKeys = ['avatar_visibility', 'profile_visibility', 'presence_visibility', 'last_seen_visibility', 'birthday_visibility', 'group_invites',
  'direct_messages', 'search_visibility', 'voice_video_messages', 'forward_link'];

vi.mock('@/features/calls', () => ({ useCallsEnabledOnServer: () => false }));
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const lang = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations: lang.en, language: 'en' }) };
});
vi.mock('../model/useChatPartners', () => ({ useChatPartners: () => [] }));
vi.mock('./usePrivacySettings', () => ({
  usePrivacySettings: () => ({
    translations: en, currentUsername: 'me', isLoadingPrivacy: false, isUpdatingPrivacy: false, isUpdatingExceptions: false, isLookingUpUser: false,
    status: null, setActiveExceptionKey: vi.fn(), exceptionDrafts: Object.fromEntries(exceptionKeys.map(key => [key, ''])), setExceptionDrafts: vi.fn(),
    debouncedSearch: '', searchData: undefined, isSearchingUsers: false, dmCandidates: [],
    visibilityLabel: (value: string) => ({ everyone: 'Everyone', shared_chats: 'Contacts', nobody: 'Nobody' }[value] ?? value),
    handlePrivacyChange, handleExceptionListChange: vi.fn(), handleAddException: vi.fn(),
    hasUnsavedChanges: false, saveChanges: vi.fn(), discardChanges: vi.fn(),
    privacySettings: {
      avatar_visibility: 'everyone', profile_visibility: 'everyone', presence_visibility: 'everyone', last_seen_visibility: 'everyone',
      birthday_visibility: 'shared_chats', read_receipts_enabled: true, calls_enabled: true, typing_indicators_enabled: true,
      direct_messages: 'everyone', group_invites: 'everyone', search_visibility: 'everyone',
      voice_video_messages: 'shared_chats', forward_link: 'nobody',
      privacy_exceptions: Object.fromEntries(exceptionKeys.map(key => [key, key === 'forward_link' ? { allow: [{ id: '4', username: 'dave', display_name: 'Dave' }], deny: [] } : empty])),
    },
  }),
}));

const renderPanel = (detail?: 'voice_video_messages' | 'forward_link') => {
  const onOpenDetail = vi.fn();
  render(<PrivacySettingsPanel isActive detail={detail} onOpenDetail={onOpenDetail} onBack={vi.fn()} onOpenRequests={vi.fn()} />);
  return onOpenDetail;
};

describe('privacy rows for voice/video and forwarded messages', () => {
  it('lists both rows with their current value and exceptions', () => {
    const onOpenDetail = renderPanel();
    const voice = screen.getByRole('button', { name: /Voice and video messages/ });
    expect(voice).toHaveTextContent('Contacts');
    expect(screen.getByRole('button', { name: /Forwarded messages/ })).toHaveTextContent('Nobody except 1');
    fireEvent.click(voice);
    expect(onOpenDetail).toHaveBeenCalledWith('voice_video_messages');
  });

  it('offers everyone and contacts for voice and video', () => {
    handlePrivacyChange.mockClear();
    renderPanel('voice_video_messages');
    const choices = screen.getAllByRole('radio');
    expect(choices.map(choice => choice.textContent)).toEqual([expect.stringContaining('Everyone'), expect.stringContaining('Contacts')]);
    fireEvent.click(choices[0]);
    expect(handlePrivacyChange).toHaveBeenCalledWith('voice_video_messages', 'everyone');
    expect(screen.getByText(en.neverAllow)).toBeInTheDocument();
  });

  it('offers nobody with an allow list for the forward link', () => {
    renderPanel('forward_link');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /Nobody/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(en.alwaysAllow)).toBeInTheDocument();
    expect(screen.getByText(en.privacyExceptionHints.forward_link.allow)).toBeInTheDocument();
  });
});
