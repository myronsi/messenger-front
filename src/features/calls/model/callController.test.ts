import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isCallActive } from '@/shared/lib/callActivity';
import type { Call } from '../api/callsApi';
import type { EngineOptions } from '../media/callEngine';
import { catchUpCallKeys, hangUpLocally, joinCall, ownsCallMedia } from './callController';
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
  setIdentity: vi.fn(), join: vi.fn(), leave: vi.fn(), get: vi.fn(), grant: vi.fn(), keys: vi.fn(), sendKeys: vi.fn(),
}));
const owner = vi.hoisted(() => ({ acquire: vi.fn() }));
const code = vi.hoisted(() => ({ compute: vi.fn() }));

vi.mock('../api/callsApi', () => ({ callsApi: api }));
vi.mock('./tabOwnership', () => ({ acquireMediaOwnership: owner.acquire }));
vi.mock('../crypto/securityCode', () => ({ securityCode: code.compute }));
vi.mock('../crypto/trustStore', () => ({ checkKnownIdentities: async () => [] }));
vi.mock('../crypto/identity', () => ({ loadOrCreateIdentity: async () => ({ publicKey: 'pk-alice', keys: {} }) }));
vi.mock('./stores', async (importOriginal) => ({
  ...await importOriginal<typeof import('./stores')>(),
  currentAccount: () => ({ userId: '1', sessionId: 's-alice' }),
}));
vi.mock('../media/callEngine', () => ({
  encryptionSupported: () => true,
  openMicrophone: async () => ({ stop: () => undefined }),
  CallEngine: class {
    connect = vi.fn(async () => undefined);
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
    api.setIdentity.mockResolvedValue(undefined);
    api.leave.mockResolvedValue(undefined);
    api.join.mockImplementation(async () => ({ call: callAt(4), grant }));
    resetCallStores();
  });

  afterEach(async () => {
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
});
