import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiProblem } from '@/shared/api/problem';
import { isCallActive } from '@/shared/lib/callActivity';
import type { Call } from '../api/callsApi';
import type { EngineOptions } from '../media/callEngine';
import { catchUpCallKeys, hangUpLocally, joinCall, ownsCallMedia, startCall } from './callController';
import { cancelTakeover } from './callControls';
import { callsStore, idleSession, receiveCall, resetCallStores, sessionStore } from './stores';

type FakeEngine = {
  options: EngineOptions;
  connect: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  handleCall: ReturnType<typeof vi.fn>;
  catchUpKeys: ReturnType<typeof vi.fn>;
};

const engines = vi.hoisted(() => [] as FakeEngine[]);
const api = vi.hoisted(() => ({
  setIdentity: vi.fn(), join: vi.fn(), leave: vi.fn(), get: vi.fn(), grant: vi.fn(), keys: vi.fn(), sendKeys: vi.fn(), start: vi.fn(),
}));
const owner = vi.hoisted(() => ({ acquire: vi.fn() }));
const code = vi.hoisted(() => ({ compute: vi.fn() }));
const media = vi.hoisted(() => ({ open: vi.fn(), connect: vi.fn() }));

vi.mock('../api/callsApi', () => ({ callsApi: api }));
vi.mock('./tabOwnership', () => ({ acquireMediaOwnership: owner.acquire }));
vi.mock('../crypto/securityCode', () => ({ securityCode: code.compute }));
vi.mock('../crypto/trustStore', () => ({ checkKnownIdentities: async () => ({ changed: [], commit: () => undefined }) }));
vi.mock('../crypto/identity', () => ({ loadOrCreateIdentity: async () => ({ publicKey: 'pk-alice', keys: {} }) }));
vi.mock('./stores', async (importOriginal) => ({
  ...await importOriginal<typeof import('./stores')>(),
  currentAccount: () => ({ userId: '1', sessionId: 's-alice' }),
}));
vi.mock('../media/callEngine', () => ({
  encryptionSupported: () => true,
  openMicrophone: media.open,
  CallEngine: class {
    connect = vi.fn(async () => media.connect(this));
    dispose = vi.fn(async () => undefined);
    handleCall = vi.fn();
    catchUpKeys = vi.fn(async () => undefined);
    constructor(public options: EngineOptions) { engines.push(this); }
  },
}));

const callAt = (version: number, epoch = version): Call => ({
  id: '10', chat_id: '77', kind: 'direct', state: 'active', end_reason: null, initiator_id: '1', created_at: '2026-11-07T10:00:00Z',
  started_at: '2026-11-07T10:00:01Z', ended_at: null, ring_expires_at: '2026-11-07T10:00:30Z', epoch, version, max_participants: 2,
  participants: [
    { user_id: '1', state: 'joined', session_id: 's-alice', identity_key: 'pk-alice', joined_at: null },
    { user_id: '2', state: 'joined', session_id: 's-bob', identity_key: 'pk-bob', joined_at: null },
  ],
});

const grant = { url: 'wss://calls.test', token: 't', identity: '1:s-alice', expires_at: '2026-11-07T11:00:00Z' };

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

const flush = async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve(); };

describe('call controller', () => {
  beforeEach(() => {
    engines.length = 0;
    vi.clearAllMocks();
    owner.acquire.mockImplementation(async () => ({ release: vi.fn() }));
    media.open.mockImplementation(async () => ({ stop: vi.fn() }));
    media.connect.mockResolvedValue(undefined);
    api.setIdentity.mockResolvedValue(undefined);
    api.leave.mockResolvedValue(undefined);
    api.join.mockImplementation(async () => ({ call: callAt(4), grant }));
    api.start.mockImplementation(async () => ({ call: { ...callAt(1), state: 'ringing' }, created: true }));
    resetCallStores();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await hangUpLocally(null);
    resetCallStores();
  });

  it('builds the engine from the newest known call when the join result is older', async () => {
    receiveCall(callAt(5));
    await joinCall('10');
    expect(engines).toHaveLength(1);
    expect(engines[0].options.call.version).toBe(5);
    expect(callsStore.get().byId['10'].version).toBe(5);
  });

  it('catches up on call keys when the realtime connection opens again', async () => {
    catchUpCallKeys();
    await joinCall('10');
    expect(engines[0].catchUpKeys).not.toHaveBeenCalled();
    catchUpCallKeys();
    expect(engines[0].catchUpKeys).toHaveBeenCalledTimes(1);
  });

  it('keeps the security code of the newest epoch when older results finish later', async () => {
    const older = deferred<string[]>();
    const newer = deferred<string[]>();
    code.compute.mockImplementation((_callId: string, epoch: number) => (epoch === 3 ? older.promise : newer.promise));
    await joinCall('10');
    const roster = [{ user_id: '2', session_id: 's-bob', identity_key: 'pk-bob' }];
    engines[0].options.events.epoch(3, roster);
    engines[0].options.events.epoch(4, roster);
    newer.resolve(['44444']);
    await flush();
    older.resolve(['33333']);
    await flush();
    expect(sessionStore.get().code).toEqual({ epoch: 4, groups: ['44444'] });
    engines[0].options.events.epoch(3, roster);
    await flush();
    expect(sessionStore.get().code).toEqual({ epoch: 4, groups: ['44444'] });
  });

  it('releases the media lock when the call is hung up while the lock is pending', async () => {
    const lock = deferred<{ release: () => void }>();
    owner.acquire.mockReturnValue(lock.promise);
    const joining = joinCall('10');
    await flush();
    await hangUpLocally(null);
    const release = vi.fn();
    lock.resolve({ release });
    await joining;
    expect(release).toHaveBeenCalledTimes(1);
    expect(ownsCallMedia()).toBe(false);
    expect(isCallActive()).toBe(false);
    expect(api.join).not.toHaveBeenCalled();
    expect(sessionStore.get()).toEqual(idleSession);
  });

  it('marks the call active only once an engine exists', async () => {
    const microphone = deferred<{ stop: () => void }>();
    media.open.mockReturnValue(microphone.promise);
    const joining = joinCall('10');
    await flush();
    expect(ownsCallMedia()).toBe(true);
    expect(isCallActive()).toBe(false);
    microphone.resolve({ stop: vi.fn() });
    await joining;
    expect(isCallActive()).toBe(true);
  });

  it('retries a lost connection one attempt at a time and asks to rejoin after the last failure', async () => {
    vi.useFakeTimers();
    api.grant.mockResolvedValue(grant);
    api.get.mockResolvedValue(callAt(4));
    await joinCall('10');
    media.connect.mockImplementation(async (engine: FakeEngine) => {
      engine.options.events.lost(false);
      throw new Error('could not connect');
    });
    engines[0].options.events.lost(false);
    engines[0].options.events.lost(false);
    await vi.runAllTimersAsync();
    expect(engines).toHaveLength(5);
    expect(engines.every((engine) => engine.dispose.mock.calls.length > 0)).toBe(true);
    expect(sessionStore.get().phase).toBe('rejoin');
    await joinCall('10');
    expect(engines).toHaveLength(6);
  });

  it('gives a recovering engine the newest call that arrived while the microphone opened', async () => {
    api.grant.mockResolvedValue(grant);
    api.get.mockResolvedValue(callAt(4));
    await joinCall('10');
    const microphone = deferred<{ stop: () => void }>();
    media.open.mockReturnValue(microphone.promise);
    engines[0].options.events.lost(false);
    await flush();
    receiveCall(callAt(6));
    microphone.resolve({ stop: vi.fn() });
    await flush();
    expect(engines).toHaveLength(2);
    expect(engines[1].options.call.version).toBe(6);
  });

  it('ignores events of an engine that was replaced', async () => {
    api.grant.mockResolvedValue(grant);
    api.get.mockResolvedValue(callAt(4));
    await joinCall('10');
    const first = engines[0];
    first.options.events.lost(false);
    await flush();
    first.options.events.patch({ phase: 'rejoin' });
    first.options.events.lost(false);
    await flush();
    expect(engines).toHaveLength(2);
    expect(sessionStore.get().phase).not.toBe('rejoin');
  });

  it('opens the microphone before starting a call, so a denied microphone never rings the callee', async () => {
    media.open.mockRejectedValue(new Error('denied'));
    await startCall('77');
    expect(api.start).not.toHaveBeenCalled();
    expect(sessionStore.get().phase).toBe('idle');
  });

  it('leaves a call it created when its own join fails', async () => {
    api.join.mockRejectedValue(new ApiProblem(503, { code: 'calls_unavailable' }));
    await startCall('77');
    expect(api.leave).toHaveBeenCalledWith('10');
    expect(sessionStore.get().notice).toBe('unavailable');
  });

  it('does not leave a call another user started when joining it fails', async () => {
    api.start.mockResolvedValue({ call: callAt(1), created: false });
    api.join.mockRejectedValue(new ApiProblem(503, { code: 'calls_unavailable' }));
    await startCall('77');
    expect(api.leave).not.toHaveBeenCalled();
  });

  it('leaves a created call when the takeover question is cancelled', async () => {
    api.join.mockRejectedValue(new ApiProblem(409, { code: 'already_in_call' }));
    await startCall('77');
    expect(sessionStore.get().takeoverCallId).toBe('10');
    expect(api.leave).not.toHaveBeenCalled();
    cancelTakeover();
    expect(api.leave).toHaveBeenCalledWith('10');
  });

  it('leaves after a failed connect only while this session still holds the call', async () => {
    media.connect.mockRejectedValueOnce(new Error('media down'));
    await joinCall('10');
    expect(api.leave).toHaveBeenCalledTimes(1);
    api.leave.mockClear();
    const connecting = deferred<void>();
    media.connect.mockReturnValueOnce(connecting.promise.then(() => { throw new Error('kicked'); }));
    const joining = joinCall('10');
    await flush();
    receiveCall({ ...callAt(9), participants: callAt(9).participants.map((p) => (p.user_id === '1' ? { ...p, session_id: 's-other' } : p)) });
    connecting.resolve();
    await joining;
    expect(api.leave).not.toHaveBeenCalled();
  });

  it('does not leave when the call was hung up locally while connecting', async () => {
    const connecting = deferred<void>();
    media.connect.mockReturnValueOnce(connecting.promise.then(() => { throw new Error('closed'); }));
    const joining = joinCall('10');
    await flush();
    await hangUpLocally('moved');
    connecting.resolve();
    await joining;
    expect(api.leave).not.toHaveBeenCalled();
    expect(sessionStore.get().notice).toBe('moved');
  });
});
