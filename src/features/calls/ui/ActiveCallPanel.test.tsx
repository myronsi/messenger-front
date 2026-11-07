import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { idleSession, type CallSession } from '../model/stores';
import ActiveCallPanel from './ActiveCallPanel';

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
  useGroupInfo: () => ({ name: '', role: null }),
  useNow: () => Date.parse('2026-11-07T10:01:00Z'),
  useUserName: (userId: string) => (userId === '2' ? 'Bob' : ''),
}));
vi.mock('../model/callController', () => ({ endCallForEveryone: vi.fn(), leaveCall: vi.fn(), rejoinCall: vi.fn() }));

const session: CallSession = { ...idleSession, callId: '10', phase: 'connected', encryption: 'failed', keyChanges: ['2'] };

describe('ActiveCallPanel', () => {
  it('keeps the key change and encryption warnings visible when the panel is minimized', () => {
    render(<ActiveCallPanel call={null} session={session} userId="1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    const alerts = screen.getAllByRole('alert').map((alert) => alert.textContent);
    expect(alerts).toEqual(['Encryption keys could not be exchanged.', 'The security key of Bob changed.']);
  });
});
