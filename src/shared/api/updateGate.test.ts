import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ value: false }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));

const loadGate = async (clientApiVersion?: string) => {
  vi.resetModules();
  vi.stubEnv('VITE_CLIENT_API_VERSION', clientApiVersion ?? '');
  return import('./updateGate');
};

describe('update gate', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    native.value = false;
    localStorage.clear();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('stays quiet while the backend speaks the same contract', async () => {
    const gate = await loadGate('1.0.0');
    gate.reportServerVersions({ apiVersion: '1.0.0', minClientApiVersion: '1.0.0' });
    expect(gate.getUpdateStatus()).toBe('none');
  });

  it('does not offer a reload in the browser just because the backend contract is newer', async () => {
    const gate = await loadGate('2.1.0-alpha.2');
    gate.reportServerVersions({ apiVersion: '2.1.0-alpha.4', minClientApiVersion: '2.0.0-alpha.1' });
    expect(gate.getUpdateStatus()).toBe('none');
  });

  it('offers the app store update in the native app when the backend api_version is newer', async () => {
    native.value = true;
    const gate = await loadGate('2.2.0');
    gate.reportServerVersions({ apiVersion: '2.4.0', minClientApiVersion: '2.2.0' });
    expect(gate.getUpdateStatus()).toBe('available');
    expect(gate.getOfferedVersion()).toBe('api:2.4.0');
  });

  it('offers an update when a different build is deployed', async () => {
    const gate = await loadGate();
    gate.reportNewBuild('0.6.7+abc1234');
    expect(gate.getUpdateStatus()).toBe('available');
    expect(gate.getOfferedVersion()).toBe('build:0.6.7+abc1234');
  });

  it('requires an update when min_client_api_version is above the client contract version', async () => {
    const gate = await loadGate('2.2.0');
    gate.reportServerVersions({ apiVersion: '2.4.0', minClientApiVersion: '2.3.0' });
    expect(gate.getUpdateStatus()).toBe('required');
  });

  it('never downgrades a required update and ignores versions it cannot parse', async () => {
    const gate = await loadGate('2.2.0');
    gate.reportClientOutdated();
    gate.reportServerVersions({ apiVersion: '2.2.0', minClientApiVersion: '2.0.0' });
    gate.reportServerVersions({ apiVersion: 'garbage', minClientApiVersion: undefined });
    gate.reportNewBuild('0.6.7+abc1234');
    gate.dismissUpdate();
    expect(gate.getUpdateStatus()).toBe('required');
  });

  it('defaults the client contract version to the installed contract package', async () => {
    const { API_VERSION } = await import('@myronsi/messenger-api');
    vi.resetModules();
    vi.stubEnv('VITE_CLIENT_API_VERSION', '');
    const { CLIENT_API_VERSION } = await import('./clientVersion');
    expect(CLIENT_API_VERSION).toBe(API_VERSION);
  });

  it('notifies subscribers once per offered version', async () => {
    const gate = await loadGate();
    const listener = vi.fn();
    const unsubscribe = gate.subscribeToUpdateStatus(listener);
    gate.reportNewBuild('0.6.7+abc1234');
    gate.reportNewBuild('0.6.7+abc1234');
    gate.reportNewBuild('0.6.8+def5678');
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(gate.getOfferedVersion()).toBe('build:0.6.8+def5678');
  });
});

describe('dismissing an update', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    native.value = false;
    localStorage.clear();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('hides the banner and remembers the dismissed version after a reload', async () => {
    const gate = await loadGate();
    gate.reportNewBuild('0.6.7+abc1234');
    gate.dismissUpdate();
    expect(gate.getUpdateStatus()).toBe('none');
    expect(localStorage.getItem(gate.DISMISSED_UPDATE_KEY)).toBe('build:0.6.7+abc1234');

    const reloaded = await loadGate();
    reloaded.reportNewBuild('0.6.7+abc1234');
    expect(reloaded.getUpdateStatus()).toBe('none');
  });

  it('shows the banner again when a newer version is offered', async () => {
    const gate = await loadGate();
    gate.reportNewBuild('0.6.7+abc1234');
    gate.dismissUpdate();
    gate.reportNewBuild('0.6.8+def5678');
    expect(gate.getUpdateStatus()).toBe('available');
  });

  it('still hides the banner for this page when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    const gate = await loadGate();
    gate.reportNewBuild('0.6.7+abc1234');
    expect(() => gate.dismissUpdate()).not.toThrow();
    gate.reportNewBuild('0.6.7+abc1234');
    expect(gate.getUpdateStatus()).toBe('none');
  });

  it('does nothing when no update is offered', async () => {
    const gate = await loadGate();
    gate.dismissUpdate();
    expect(localStorage.getItem(gate.DISMISSED_UPDATE_KEY)).toBeNull();
  });
});
