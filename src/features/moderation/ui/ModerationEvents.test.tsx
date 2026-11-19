import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportIfAccountRestricted } from '@/shared/api/accountRestriction';
import { ModerationEvents } from './ModerationEvents';

const mocks = vi.hoisted(() => ({
  listener: null as null | { onEvent?: (event: unknown) => void }, dispatch: vi.fn(), toast: vi.fn(), upsert: vi.fn(), invalidate: vi.fn(),
  update: vi.fn(), markRead: vi.fn(), outcomes: undefined as unknown,
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
  moderationApi: { util: { upsertQueryData: mocks.upsert, invalidateTags: mocks.invalidate, updateQueryData: mocks.update } },
  useListReportOutcomesQuery: () => ({ data: mocks.outcomes }),
  useMarkReportOutcomeReadMutation: () => [mocks.markRead],
}));

const outcome = (id: string, read: boolean, kind = 'action_taken') => ({
  id, subject_type: 'user', subject_id: '9', outcome: kind, created_at: '2026-11-19T10:00:00Z', read,
});

describe('ModerationEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockReturnValue('upsert');
    mocks.invalidate.mockReturnValue('invalidate');
    mocks.update.mockReturnValue('update');
    mocks.outcomes = undefined;
  });

  it('announces each unread report outcome once and marks it read', () => {
    mocks.outcomes = { items: [outcome('2', false, 'no_violation'), outcome('1', true)] };
    const { rerender } = render(<ModerationEvents onOpenDetails={vi.fn()} />);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith('Your report about a person', {
      id: 'report-outcome:2', description: 'We reviewed it and found no violation of our rules.',
    });
    expect(mocks.markRead).toHaveBeenCalledWith('2');
    mocks.outcomes = { items: [outcome('2', false, 'no_violation'), outcome('1', true)] };
    rerender(<ModerationEvents onOpenDetails={vi.fn()} />);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
  });

  it('adds a live report_outcome event to the list', () => {
    render(<ModerationEvents onOpenDetails={vi.fn()} />);
    const data = outcome('3', false);
    mocks.listener?.onEvent?.({ type: 'report_outcome', event_id: '4', chat_id: null, data });
    expect(mocks.update).toHaveBeenCalledWith('listReportOutcomes', undefined, expect.any(Function));
    expect(mocks.dispatch).toHaveBeenCalledWith('update');
    const recipe = mocks.update.mock.lastCall?.[2] as (draft: { items: unknown[] }) => void;
    const draft = { items: [outcome('1', true)] };
    recipe(draft);
    recipe(draft);
    expect(draft.items).toEqual([data, outcome('1', true)]);
  });

  it('stores a live account_status event', () => {
    render(<ModerationEvents onOpenDetails={vi.fn()} />);
    const data = { status: 'warned', since: null, restrictions: [], can_appeal: true, probation_until: null, review_requested_at: null, can_request_review: true };
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
