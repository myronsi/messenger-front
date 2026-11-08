import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { idleSession, type CallSession } from '../model/stores';
import ActiveCallPanel from './ActiveCallPanel';

const view = vi.hoisted(() => ({ minimizeCall: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    translations: new Proxy({}, {
      get: (_target, key) => ({
        callKeyChanged: 'The security key of {name} changed.', callEncryptionFailed: 'Encryption keys could not be exchanged.',
        callMinimize: 'Minimize', callExpand: 'Expand', callParticipantsCount: '{count} people',
      } as Record<string, string>)[String(key)] ?? String(key),
    }),
  }),
}));
vi.mock('./callHooks', () => ({
  useCallTitle: () => ({ title: 'Bob', caller: 'Bob' }),
  useCallAvatar: () => '',
  useGroupInfo: () => ({ name: '', role: null }),
  useNow: () => Date.parse('2026-11-07T10:01:00Z'),
  useUserName: (userId: string) => (userId === '2' ? 'Bob' : ''),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => null }));
vi.mock('../model/callController', () => ({ endCallForEveryone: vi.fn(), leaveCall: vi.fn(), rejoinCall: vi.fn() }));
vi.mock('../model/callView', () => view);

const session: CallSession = { ...idleSession, callId: '10', phase: 'connected', encryption: 'failed', keyChanges: ['2'] };

describe('ActiveCallPanel', () => {
  it('shows the call name, keeps the security warnings visible and minimizes on request', () => {
    render(<ActiveCallPanel call={null} session={session} userId="1" />);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    const alerts = screen.getAllByRole('alert').map((alert) => alert.textContent);
    expect(alerts).toEqual(['Encryption keys could not be exchanged.', 'The security key of Bob changed.']);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));
    expect(view.minimizeCall).toHaveBeenCalledTimes(1);
  });
});
