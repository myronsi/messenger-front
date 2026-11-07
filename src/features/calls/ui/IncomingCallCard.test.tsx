import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Call } from '../api/callsApi';
import CallAnnouncer from './CallAnnouncer';
import IncomingCallCard from './IncomingCallCard';

const control = vi.hoisted(() => ({ declineCall: vi.fn(async () => undefined), joinCall: vi.fn(async () => undefined) }));
vi.mock('../model/callController', () => control);
vi.mock('./useRingtone', () => ({ useRingtone: () => undefined }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('./callHooks', () => ({
  useCallSession: () => ({ callId: null, otherTab: false }),
  useCallTitle: (call: Call | null) => ({ title: call ? 'Alice' : '', caller: call ? 'Alice' : '' }),
  useNow: () => Date.now(),
}));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: {
    callIncoming: 'Incoming call', callIncomingGroup: 'Incoming group call', callAccept: 'Accept', callDecline: 'Decline',
    callRingsFor: 'Rings for {time}', callInCallCount: '{count} in the call', callUnsupported: 'Unsupported', callInOtherTab: 'Other tab',
    callAnnounceIncoming: 'Incoming call from {name}', callAnnounceEnded: 'Call ended',
  } }),
}));

const scope = window as unknown as { RTCRtpScriptTransform?: unknown };
const call = (id: string): Call => ({
  id, chat_id: '77', kind: 'direct', state: 'ringing', end_reason: null, initiator_id: '2', created_at: new Date().toISOString(),
  started_at: null, ended_at: null, ring_expires_at: new Date(Date.now() + 30_000).toISOString(), epoch: 1, version: 1, max_participants: 2,
  participants: [
    { user_id: '2', state: 'joined', session_id: 's-2', identity_key: null, joined_at: null },
    { user_id: '1', state: 'ringing', session_id: null, identity_key: null, joined_at: null },
  ],
});

describe('incoming call card', () => {
  beforeEach(() => { scope.RTCRtpScriptTransform = function RTCRtpScriptTransform() { return undefined; }; });
  afterEach(() => { delete scope.RTCRtpScriptTransform; vi.clearAllMocks(); vi.useRealTimers(); });

  it('does not take the keyboard focus, so typing cannot answer the call', () => {
    const composer = document.createElement('textarea');
    document.body.append(composer);
    composer.focus();
    render(<IncomingCallCard call={call('10')} userId="1" />);
    expect(document.activeElement).toBe(composer);
    fireEvent.keyDown(composer, { key: 'Enter' });
    fireEvent.keyDown(composer, { key: ' ' });
    expect(control.joinCall).not.toHaveBeenCalled();
    composer.remove();
  });

  it('does not decline on Escape and keeps both buttons reachable', () => {
    render(<IncomingCallCard call={call('10')} userId="1" />);
    const accept = screen.getByRole('button', { name: 'Accept' });
    accept.focus();
    fireEvent.keyDown(accept, { key: 'Escape' });
    expect(control.declineCall).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(control.declineCall).toHaveBeenCalledWith('10');
  });

  it('announces every new call, also a second one from the same caller', () => {
    vi.useFakeTimers();
    const { rerender } = render(<CallAnnouncer incoming={call('10')} inCall={false} userId="1" />);
    const live = () => document.querySelector('[aria-live="assertive"]')?.textContent;
    act(() => { vi.advanceTimersByTime(200); });
    expect(live()).toBe('Incoming call from Alice');
    rerender(<CallAnnouncer incoming={null} inCall={false} userId="1" />);
    expect(live()).toBe('');
    rerender(<CallAnnouncer incoming={call('11')} inCall={false} userId="1" />);
    expect(live()).toBe('');
    act(() => { vi.advanceTimersByTime(200); });
    expect(live()).toBe('Incoming call from Alice');
    rerender(<CallAnnouncer incoming={call('12')} inCall={false} userId="1" />);
    expect(live()).toBe('');
    act(() => { vi.advanceTimersByTime(200); });
    expect(live()).toBe('Incoming call from Alice');
  });
});
