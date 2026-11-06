import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subscribe, toast, dispatch, open } = vi.hoisted(() => ({
  subscribe: vi.fn(), toast: vi.fn(), dispatch: vi.fn(), open: vi.fn(),
}));

vi.mock('@/shared/api/realtime', () => ({ realtime: { subscribe } }));
vi.mock('@/shared/auth/session', () => ({ getAccessToken: () => 'own-token' }));
vi.mock('@/shared/auth/tokenClaims', () => ({ getTokenSession: (token: string) => token === 'own-token' ? 'own-session' : null }));
vi.mock('@/shared/ui/sonner', () => ({ toast }));
vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => dispatch }));
vi.mock('@/shared/lib/useUrlOverlay', () => ({ useUrlOverlay: () => ({ open }) }));
vi.mock('@/features/profile', () => ({ recoveryApi: { util: { invalidateTags: (tags: string[]) => ({ type: 'invalidate', tags }) } } }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { securityPage: {
    notices: { login: 'New sign-in' }, eventFallback: 'Security change', noticeToast: '{event} on {device}', reviewSessions: 'Review sessions',
  } } }),
}));

import { SecurityNoticeHandler } from './SecurityNoticeHandler';

const emit = (event: unknown) => {
  const handler = subscribe.mock.lastCall?.[0] as { onEvent: (event: unknown) => void };
  handler.onEvent(event);
};

describe('SecurityNoticeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribe.mockReturnValue(() => undefined);
  });

  it('shows a toast for a security alert and refreshes the security data', () => {
    render(<SecurityNoticeHandler />);
    emit({ type: 'security_alert', event_id: '7', chat_id: null, data: { type: 'login', user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0' } });
    expect(toast).toHaveBeenCalledExactlyOnceWith('New sign-in on Chrome on Windows', expect.objectContaining({ id: 'security:7' }));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'invalidate', tags: ['Auth'] });
  });

  it('leaves the password-reset notice to the sign-out handler', () => {
    render(<SecurityNoticeHandler />);
    emit({ type: 'security_notice', event_id: '8', chat_id: null, data: { type: 'password_reset' } });
    expect(toast).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('skips alerts about changes made by this session', () => {
    render(<SecurityNoticeHandler />);
    emit({ type: 'security_alert', event_id: '9', chat_id: null, data: { type: 'passkey_added', session_id: 'own-session' } });
    expect(toast).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'invalidate', tags: ['Auth'] });
    emit({ type: 'security_alert', event_id: '10', chat_id: null, data: { type: 'login', session_id: 'other-session' } });
    expect(toast).toHaveBeenCalledOnce();
  });
});
