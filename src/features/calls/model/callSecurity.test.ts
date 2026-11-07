import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RosterEntry } from './callState';
import { onEpoch } from './callSecurity';
import { idleSession, sessionStore } from './stores';

const trust = vi.hoisted(() => ({ check: vi.fn(), commit: vi.fn() }));
const code = vi.hoisted(() => ({ compute: vi.fn() }));

vi.mock('../crypto/trustStore', () => ({ checkKnownIdentities: trust.check }));
vi.mock('../crypto/securityCode', () => ({ securityCode: code.compute }));
vi.mock('./stores', async (importOriginal) => ({
  ...await importOriginal<typeof import('./stores')>(),
  currentAccount: () => ({ userId: '1', sessionId: 's-alice' }),
}));

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

const bob: RosterEntry = { user_id: '2', session_id: 's-bob', identity_key: 'pk-bob-new' };

describe('call security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.set({ ...idleSession, callId: '10', phase: 'connected' });
    code.compute.mockImplementation(async (_callId: string, epoch: number) => [String(epoch)]);
  });

  it('keeps a key change found for an epoch that was already superseded', async () => {
    const first = deferred<{ changed: RosterEntry[]; commit: () => void }>();
    trust.check.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ changed: [], commit: trust.commit });
    const older = onEpoch('10', 3, [bob]);
    await onEpoch('10', 4, [bob]);
    first.resolve({ changed: [bob], commit: trust.commit });
    await older;
    expect(sessionStore.get().keyChanges).toEqual(['2']);
    expect(sessionStore.get().code).toEqual({ epoch: 4, groups: ['4'] });
    expect(trust.commit).toHaveBeenCalledTimes(2);
  });

  it('does not store new fingerprints when the call is gone before the warning could be shown', async () => {
    const pending = deferred<{ changed: RosterEntry[]; commit: () => void }>();
    trust.check.mockReturnValueOnce(pending.promise);
    const checking = onEpoch('10', 5, [bob]);
    sessionStore.set(idleSession);
    pending.resolve({ changed: [bob], commit: trust.commit });
    await checking;
    expect(trust.commit).not.toHaveBeenCalled();
  });
});
