import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Call } from '../api/callsApi';
import { configStore, idleSession, type CallSession } from '../model/stores';
import { resetVideo, setVideoFeeds, videoStore } from '../model/videoStore';
import ActiveCallPanel from './ActiveCallPanel';

const view = vi.hoisted(() => ({ minimizeCall: vi.fn() }));
const controls = vi.hoisted(() => ({
  enableCallAudio: vi.fn(), selectInputDevice: vi.fn(), selectOutputDevice: vi.fn(), toggleMute: vi.fn(), setCodeVerified: vi.fn(),
  toggleCamera: vi.fn(), flipCamera: vi.fn(), selectCameraDevice: vi.fn(), toggleScreenShare: vi.fn(), stopScreenShare: vi.fn(),
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
  useUserAvatar: () => '',
  useTileName: (tile: { self: boolean; kind: string }) => {
    const person = tile.self ? 'You' : 'Bob';
    return { person, name: tile.kind === 'screen' ? `${person} screen` : person };
  },
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => null }));
vi.mock('../model/callController', () => ({ endCallForEveryone: vi.fn(), leaveCall: vi.fn(), rejoinCall: vi.fn() }));
vi.mock('../model/callView', () => view);
vi.mock('../model/callControls', () => controls);

const session: CallSession = { ...idleSession, callId: '10', phase: 'connected', encryption: 'failed', keyChanges: ['2'] };
const ready: CallSession = { ...session, encryption: 'ready', keyChanges: [] };
const handle = { attach: (element: HTMLMediaElement) => element, detach: () => undefined };
const call = {
  id: '10', kind: 'direct', participants: [
    { user_id: '1', state: 'joined', session_id: 's-1', identity_key: 'k1', joined_at: null },
    { user_id: '2', state: 'joined', session_id: 's-2', identity_key: 'k2', joined_at: null },
  ],
} as unknown as Call;

const enableVideo = (video: boolean, share: boolean) => configStore.set({
  enabled: true, max_participants: 10, ring_timeout_seconds: 30, video_enabled: video, screen_share_enabled: share,
});

const displayMedia = (available: boolean) => Object.defineProperty(navigator, 'mediaDevices', {
  configurable: true, value: available ? { getDisplayMedia: vi.fn() } : {},
});

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

  afterEach(() => {
    configStore.set(null);
    resetVideo();
    displayMedia(false);
  });

  it('shows the camera and share controls only when the server enables them and the browser can share', () => {
    const { rerender } = render(<ActiveCallPanel call={null} session={ready} userId="1" />);
    expect(screen.queryByRole('button', { name: 'callCameraOn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'callShareScreen' })).not.toBeInTheDocument();
    act(() => enableVideo(true, true));
    expect(screen.queryByRole('button', { name: 'callShareScreen' })).not.toBeInTheDocument();
    displayMedia(true);
    rerender(<ActiveCallPanel call={null} session={{ ...ready }} userId="1" />);
    fireEvent.click(screen.getByRole('button', { name: 'callCameraOn' }));
    expect(controls.toggleCamera).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'callShareScreen' }));
    expect(controls.toggleScreenShare).toHaveBeenCalledTimes(1);
    act(() => enableVideo(false, true));
    expect(screen.queryByRole('button', { name: 'callCameraOn' })).not.toBeInTheDocument();
  });

  it('lists the cameras next to the microphones when video is on', () => {
    enableVideo(true, false);
    render(<ActiveCallPanel call={null} session={{ ...ready, cameras: [{ id: 'c2', label: 'Desk camera' }] }} userId="1" />);
    fireEvent.click(screen.getByRole('button', { name: 'callDevices' }));
    const cameras = within(screen.getByRole('dialog', { name: 'callDevices' })).getByRole('radiogroup', { name: 'callCamera' });
    fireEvent.click(within(cameras).getByRole('radio', { name: 'Desk camera' }));
    expect(controls.selectCameraDevice).toHaveBeenCalledWith('c2');
  });

  it('shows the sharing bar while the own screen is shared and stops from it', () => {
    enableVideo(false, true);
    displayMedia(true);
    render(<ActiveCallPanel call={null} session={{ ...ready, sharing: 'on' }} userId="1" />);
    const bar = screen.getByRole('status');
    expect(bar).toHaveTextContent('callSharingBar');
    fireEvent.click(within(bar).getByRole('button', { name: 'callSharingStop' }));
    expect(controls.stopScreenShare).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'callStopSharing' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches from the avatar to video tiles and pins a tile on click', () => {
    render(<ActiveCallPanel call={call} session={ready} userId="1" sessionId="s-1" />);
    expect(screen.queryByRole('button', { name: 'callPin' })).not.toBeInTheDocument();
    act(() => setVideoFeeds([{ id: '2:s-2/TR', identity: '2:s-2', source: 'camera', local: false, muted: false, mirrored: false, handle }]));
    const tiles = screen.getAllByRole('button', { name: 'callPin' });
    expect(tiles).toHaveLength(2);
    expect(tiles[0].querySelector('video')).not.toBeNull();
    expect(tiles[1].querySelector('video')).toBeNull();
    fireEvent.click(tiles[0]);
    expect(videoStore.get().pinned).toBe('person:2:s-2');
    expect(screen.getByRole('button', { name: 'callUnpin' })).toHaveAttribute('aria-pressed', 'true');
  });
});
