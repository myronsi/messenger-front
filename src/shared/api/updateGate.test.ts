import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadGate = async (clientApiVersion?: string) => {
  vi.resetModules();
  vi.stubEnv('VITE_CLIENT_API_VERSION', clientApiVersion ?? '');
  return import('./updateGate');
};

describe('update gate', () => {
  beforeEach(() => { vi.unstubAllEnvs(); });

  it('stays quiet while the backend speaks the same contract', async () => {
    const gate = await loadGate('1.0.0');
    gate.reportServerVersions({ apiVersion: '1.0.0', minClientApiVersion: '1.0.0' });
    expect(gate.getUpdateStatus()).toBe('none');
  });

  it('offers a non-blocking update when the backend api_version is newer', async () => {
    const gate = await loadGate('2.2.0');
    gate.reportServerVersions({ apiVersion: '2.4.0', minClientApiVersion: '2.2.0' });
    expect(gate.getUpdateStatus()).toBe('available');
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
    expect(gate.getUpdateStatus()).toBe('required');
  });

  it('defaults the client contract version to the installed contract package', async () => {
    const { API_VERSION } = await import('@myronsi/messenger-api');
    vi.resetModules();
    vi.stubEnv('VITE_CLIENT_API_VERSION', '');
    const { CLIENT_API_VERSION } = await import('./clientVersion');
    expect(CLIENT_API_VERSION).toBe(API_VERSION);
  });

  it('notifies subscribers once when the status changes', async () => {
    const gate = await loadGate('2.2.0');
    const listener = vi.fn();
    const unsubscribe = gate.subscribeToUpdateStatus(listener);
    gate.reportServerVersions({ apiVersion: '2.4.0' });
    gate.reportServerVersions({ apiVersion: '2.5.0' });
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});