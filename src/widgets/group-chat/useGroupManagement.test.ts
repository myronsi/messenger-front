import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { GroupDetails, GroupProfileConfirmState } from './GroupProfileTypes';
import type { GroupTranslations } from './groupChatTypes';
import { useGroupManagement } from './useGroupManagement';

const authFetch = vi.hoisted(() => vi.fn());
vi.mock('@/shared/auth/session', () => ({ authFetch }));
vi.mock('@/features/profile', () => ({ setGroupBackground: vi.fn() }));

const setup = (role: string) => {
  const setGroupConfirm = vi.fn();
  const onBack = vi.fn();
  const { result } = renderHook(() => useGroupManagement({
    chatId: '31', token: 't', groupForm: { name: 'Team', description: '' }, setModal: vi.fn(),
    translations: en as unknown as GroupTranslations, setIsSavingGroup: vi.fn(), applyGroupDetails: vi.fn(),
    participantInput: '', setParticipantInput: vi.fn(), refreshGroupDetails: vi.fn(), setGroupConfirm,
    groupDetails: { name: 'Team', current_user_role: role } as unknown as GroupDetails, onBack,
  }));
  return { result, setGroupConfirm, onBack };
};

const lastConfirm = (setGroupConfirm: ReturnType<typeof vi.fn>) => setGroupConfirm.mock.lastCall?.[0] as GroupProfileConfirmState;

describe('useGroupManagement leave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authFetch.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  });
  afterEach(() => vi.useRealTimers());

  it('asks with the group name and plain points, then leaves with POST', async () => {
    const { result, setGroupConfirm, onBack } = setup('member');
    result.current.handleLeaveGroup();
    vi.runAllTimers();
    const confirm = lastConfirm(setGroupConfirm);
    expect(confirm).toMatchObject({ title: 'Leave Team?', kind: 'leave', isDestructive: true, confirmText: 'Leave group' });
    expect(confirm.consequences).toEqual(en.leaveGroupPoints);
    await confirm.onConfirm();
    expect(authFetch).toHaveBeenCalledWith(expect.stringMatching(/\/groups\/31\/leave$/), expect.objectContaining({ method: 'POST' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('tells the owner to transfer ownership first', () => {
    const { result, setGroupConfirm } = setup('owner');
    result.current.handleLeaveGroup();
    vi.runAllTimers();
    expect(lastConfirm(setGroupConfirm)).toMatchObject({ isError: true, message: en.ownerLeaveGroupHint });
    expect(authFetch).not.toHaveBeenCalled();
  });
});
