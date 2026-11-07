import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalAudioTrack } from 'livekit-client';
import type { Call, CallsApi } from '../api/callsApi';
import { exportIdentityKey, generateIdentityKeys, type CallIdentity } from '../crypto/identity';
import { CallEngine, type EngineEvents } from './callEngine';

const rooms = vi.hoisted(() => [] as {
  handlers: Map<string, (...args: unknown[]) => void>;
  connect: ReturnType<typeof vi.fn>;
  switchActiveDevice: ReturnType<typeof vi.fn>;
  localParticipant: { publishTrack: ReturnType<typeof vi.fn> };
}[]);

vi.mock('livekit-client/e2ee-worker?worker', () => ({ default: class { terminate = vi.fn(); } }));
vi.mock('livekit-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('livekit-client')>();
  class FakeRoom {
    static getLocalDevices = vi.fn(async () => []);
    handlers = new Map<string, (...args: unknown[]) => void>();
    canPlaybackAudio = true;
    connect = vi.fn(async () => undefined);
    setE2EEEnabled = vi.fn(async () => undefined);
    disconnect = vi.fn(async () => undefined);
    switchActiveDevice = vi.fn(async () => true);
    getActiveDevice = vi.fn(() => undefined);
    removeAllListeners = vi.fn();
    localParticipant = { publishTrack: vi.fn(async () => undefined) };
    constructor() { rooms.push(this); }
    on(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.set(event, handler);
      return this;
    }
  }
  return { ...actual, Room: FakeRoom, isE2EESupported: () => true };
});

const identity = async (): Promise<CallIdentity> => {
  const keys = await generateIdentityKeys();
  return { keys, publicKey: await exportIdentityKey(keys.publicKey) };
};

const microphone = () => ({
  isMuted: false,
  mediaStreamTrack: { enabled: true },
  mute: vi.fn(async function mute(this: { isMuted: boolean }) { this.isMuted = true; }),
  unmute: vi.fn(async function unmute(this: { isMuted: boolean }) { this.isMuted = false; }),
  setDeviceId: vi.fn(async () => true),
  stop: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

const setup = async () => {
  const alice = await identity();
  const bob = await identity();
  const call: Call = {
    id: '10', chat_id: '77', kind: 'direct', state: 'active', end_reason: null, initiator_id: '1', created_at: '2026-11-07T10:00:00Z',
    started_at: null, ended_at: null, ring_expires_at: '2026-11-07T10:00:30Z', epoch: 1, version: 1, max_participants: 2,
    participants: [
      { user_id: '1', state: 'joined', session_id: 's-alice', identity_key: alice.publicKey, joined_at: null },
      { user_id: '2', state: 'joined', session_id: 's-bob', identity_key: bob.publicKey, joined_at: null },
    ],
  };
  const events: EngineEvents = { patch: vi.fn(), call: vi.fn(), epoch: vi.fn(), lost: vi.fn() };
  const mic = microphone();
  const api = {
    sendKeys: vi.fn(async () => undefined), get: vi.fn(), setIdentity: vi.fn(),
    keys: vi.fn(async () => ({ call_id: '10', epoch: 1, items: [] })),
  } as unknown as CallsApi;
  const engine = new CallEngine({
    call, grant: { url: 'wss://calls.test', token: 't', identity: '1:s-alice', expires_at: '2026-11-07T11:00:00Z' },
    userId: '1', sessionId: 's-alice', identity: alice, microphone: mic as unknown as LocalAudioTrack, muted: false, api, events,
  });
  return { engine, events, mic, room: rooms[rooms.length - 1] };
};

describe('call engine', () => {
  beforeEach(() => { rooms.length = 0; });

  it('reports a lost room only after the connection was established', async () => {
    const { engine, events, room } = await setup();
    room.connect.mockImplementationOnce(async () => {
      room.handlers.get('disconnected')?.(undefined);
      throw new Error('could not connect');
    });
    await expect(engine.connect()).rejects.toThrow('could not connect');
    expect(events.lost).not.toHaveBeenCalled();
    await engine.connect();
    room.handlers.get('disconnected')?.(undefined);
    room.handlers.get('disconnected')?.(undefined);
    expect(events.lost).toHaveBeenCalledTimes(1);
    await engine.dispose();
  });

  it('switches to the default microphone without an exact constraint and restores it when a device fails', async () => {
    const { engine, mic, room } = await setup();
    await engine.selectInput('');
    expect(mic.setDeviceId).toHaveBeenLastCalledWith('default');
    await engine.connect();
    await vi.waitFor(() => expect(room.localParticipant.publishTrack).toHaveBeenCalled());
    await engine.selectInput('');
    expect(room.switchActiveDevice).toHaveBeenLastCalledWith('audioinput', 'default', false);
    room.switchActiveDevice.mockRejectedValueOnce(new Error('OverconstrainedError'));
    await expect(engine.selectInput('mic-2')).rejects.toThrow('OverconstrainedError');
    expect(room.switchActiveDevice.mock.calls.slice(-2)).toEqual([['audioinput', 'mic-2', true], ['audioinput', 'default', false]]);
    await engine.dispose();
  });

  it('keeps the microphone muted through LiveKit until the own key of the epoch is installed', async () => {
    const { engine, mic, room } = await setup();
    await engine.connect();
    await vi.waitFor(() => expect(room.localParticipant.publishTrack).toHaveBeenCalled());
    expect(mic.mute).toHaveBeenCalled();
    await vi.waitFor(() => expect(mic.isMuted).toBe(false));
    expect(mic.mute.mock.invocationCallOrder[0]).toBeLessThan(room.localParticipant.publishTrack.mock.invocationCallOrder[0]);
    await engine.dispose();
  });

  it('does not play unencrypted remote audio', async () => {
    const { engine, room } = await setup();
    await engine.connect();
    const plain = { kind: 'audio', attach: vi.fn(() => document.createElement('audio')), detach: vi.fn() };
    room.handlers.get('trackSubscribed')?.(plain, { isEncrypted: false }, { identity: '2:s-bob' });
    expect(plain.attach).not.toHaveBeenCalled();
    const sealed = { kind: 'audio', attach: vi.fn(() => document.createElement('audio')), detach: vi.fn() };
    room.handlers.get('trackSubscribed')?.(sealed, { isEncrypted: true }, { identity: '2:s-bob' });
    expect(sealed.attach).toHaveBeenCalledTimes(1);
    await engine.dispose();
  });
});
