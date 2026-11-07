import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configStore, idleSession, sessionStore } from '../model/stores';
import CallButton from './CallButton';

const native = vi.hoisted(() => ({ value: false }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { callStart: 'Start audio call', callInOtherTab: 'You are in a call in another tab.' } }),
}));

const scope = window as unknown as { RTCRtpScriptTransform?: unknown };
const enable = () => act(() => configStore.set({ enabled: true, max_participants: 10, ring_timeout_seconds: 30 }));

describe('CallButton', () => {
  beforeEach(() => {
    native.value = false;
    scope.RTCRtpScriptTransform = function RTCRtpScriptTransform() { return undefined; };
    configStore.set(null);
    sessionStore.set(idleSession);
  });
  afterEach(() => { delete scope.RTCRtpScriptTransform; });

  it('shows the call button when the server enables calls and the browser can encrypt them', () => {
    render(<CallButton chatId="77" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    enable();
    expect(screen.getByRole('button', { name: 'Start audio call' })).toBeEnabled();
  });

  it('stays hidden when calls are disabled on the server', () => {
    act(() => configStore.set({ enabled: false, max_participants: 10, ring_timeout_seconds: 30 }));
    render(<CallButton chatId="77" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('stays hidden in browsers without call encryption', () => {
    delete scope.RTCRtpScriptTransform;
    enable();
    render(<CallButton chatId="77" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('stays hidden in the native app shell', () => {
    native.value = true;
    enable();
    render(<CallButton chatId="77" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('stays hidden for chats that do not exist yet and is disabled while another tab owns the call', () => {
    enable();
    const { rerender } = render(<CallButton chatId={0} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<CallButton chatId="77" />);
    act(() => sessionStore.set({ ...idleSession, otherTab: true }));
    expect(screen.getByRole('button', { name: 'You are in a call in another tab.' })).toBeDisabled();
  });
});
