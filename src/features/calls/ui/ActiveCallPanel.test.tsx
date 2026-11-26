import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { idleSession, type CallSession } from '../model/stores';
import ActiveCallPanel from './ActiveCallPanel';

const view = vi.hoisted(() => ({ minimizeCall: vi.fn() }));
const controls = vi.hoisted(() => ({
  enableCallAudio: vi.fn(), selectInputDevice: vi.fn(), selectOutputDevice: vi.fn(), toggleMute: vi.fn(), setCodeVerified: vi.fn(),
}));

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
vi.mock('../model/callControls', () => controls);

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

  it('lists the microphones in a sheet and switches to the one picked', () => {
    const withDevices: CallSession = { ...session, encryption: 'ready', keyChanges: [], inputs: [{ id: 'm2', label: 'Headset' }] };
    render(<ActiveCallPanel call={null} session={withDevices} userId="1" />);
    fireEvent.click(screen.getByRole('button', { name: 'callDevices' }));
    const sheet = screen.getByRole('dialog', { name: 'callDevices' });
    expect(within(sheet).getByRole('radio', { name: 'callDefaultDevice' })).toHaveAttribute('aria-checked', 'true');
    expect(within(sheet).queryByRole('radiogroup', { name: 'callAudioOutput' })).not.toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Headset' }));
    expect(controls.selectInputDevice).toHaveBeenCalledWith('m2');
  });

  it('opens the security code from the encryption badge and closes it with Escape', async () => {
    render(<ActiveCallPanel call={null} session={{ ...session, encryption: 'ready', keyChanges: [] }} userId="1" />);
    const badge = screen.getByRole('button', { name: 'callEncrypted' });
    badge.focus();
    fireEvent.click(badge);
    const sheet = screen.getByRole('dialog', { name: 'callMore' });
    expect(within(sheet).getByRole('region', { name: 'callSecurityCode' })).toBeInTheDocument();
    fireEvent.keyDown(sheet, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(badge).toHaveFocus());
  });

  it('shows the muted state on the microphone button', () => {
    render(<ActiveCallPanel call={null} session={{ ...session, muted: true }} userId="1" />);
    const mute = screen.getByRole('button', { name: 'callMute' });
    expect(mute).toHaveAttribute('aria-pressed', 'true');
    expect(mute).toHaveTextContent('callMuted');
    fireEvent.click(mute);
    expect(controls.toggleMute).toHaveBeenCalledTimes(1);
  });
});
