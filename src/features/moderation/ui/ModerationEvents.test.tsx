import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportIfAccountRestricted } from '@/shared/api/accountRestriction';
import { ModerationEvents } from './ModerationEvents';

const mocks = vi.hoisted(() => ({
  listener: null as null | { onEvent?: (event: unknown) => void }, dispatch: vi.fn(), toast: vi.fn(), upsert: vi.fn(), invalidate: vi.fn(),
}));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/sonner', () => ({ toast: mocks.toast }));
vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock('@/shared/api/realtime', () => ({
  realtime: { subscribe: (listener: { onEvent?: (event: unknown) => void }) => { mocks.listener = listener; return () => { mocks.listener = null; }; } },
}));
vi.mock('../api/moderationApi', () => ({
  moderationApi: { util: { upsertQueryData: mocks.upsert, invalidateTags: mocks.invalidate } },
}));

describe('ModerationEvents', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.upsert.mockReturnValue('upsert'); mocks.invalidate.mockReturnValue('invalidate'); });

  it('stores a live account_status event', () => {
    render(<ModerationEvents onOpenDetails={vi.fn()} />);
    const data = { status: 'warned', since: null, restrictions: [], can_appeal: true, probation_until: null };
    mocks.listener?.onEvent?.({ type: 'account_status', event_id: '1', chat_id: null, data });
    expect(mocks.upsert).toHaveBeenCalledWith('getAccountStatus', undefined, data);
    expect(mocks.dispatch).toHaveBeenCalledWith('upsert');
  });

  it('shows one shared toast naming the restriction for HTTP and WebSocket refusals', () => {
    const onOpenDetails = vi.fn();
    render(<ModerationEvents onOpenDetails={onOpenDetails} />);
    reportIfAccountRestricted(403, { code: 'account_restricted', restriction: 'create_group' });
    expect(mocks.toast).toHaveBeenLastCalledWith('Not allowed for your account', expect.objectContaining({
      id: 'account-restricted:create_group', description: 'Creating groups is blocked by your account status.',
    }));
    mocks.listener?.onEvent?.({ type: 'error', event_id: '2', chat_id: '5', data: { code: 'account_restricted', restriction: 'send' } });
    expect(mocks.toast).toHaveBeenLastCalledWith('Not allowed for your account', expect.objectContaining({
      id: 'account-restricted:send', description: 'Sending messages is blocked by your account status.',
    }));
    expect(mocks.invalidate).toHaveBeenCalledWith([{ type: 'Moderation', id: 'me' }]);
    mocks.toast.mock.lastCall?.[1].action.onClick();
    expect(onOpenDetails).toHaveBeenCalled();
  });

  it('ignores other WebSocket errors', () => {
    render(<ModerationEvents onOpenDetails={vi.fn()} />);
    mocks.listener?.onEvent?.({ type: 'error', event_id: '3', chat_id: '5', data: { code: 'forbidden' } });
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
