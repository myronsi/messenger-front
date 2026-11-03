import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkForNewBuild, fetchDeployedBuild, RUNNING_BUILD_ID } from './deployedBuild';
import { getOfferedVersion, getUpdateStatus, resetUpdateStatusForTests } from './updateGate';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

const respondWith = (body: unknown, status = 200) => vi.spyOn(globalThis, 'fetch')
  .mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('deployed build check', () => {
  beforeEach(() => {
    localStorage.clear();
    resetUpdateStatusForTests();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('asks for version.json without the HTTP cache', async () => {
    const fetchSpy = respondWith({ version: '0.6.7', commit: 'abc1234' });
    await expect(fetchDeployedBuild()).resolves.toEqual({ version: '0.6.7', commit: 'abc1234' });
    expect(fetchSpy).toHaveBeenCalledWith('/version.json', { cache: 'no-store' });
  });

  it('identifies the running build by its app version and commit', () => {
    expect(RUNNING_BUILD_ID).toBe(`${__APP_VERSION__}+${__APP_COMMIT__}`);
  });

  it('stays quiet when the running build is the deployed one', async () => {
    respondWith({ version: __APP_VERSION__, commit: __APP_COMMIT__ });
    await checkForNewBuild();
    expect(getUpdateStatus()).toBe('none');
  });

  it('offers an update when another build is deployed', async () => {
    respondWith({ version: '99.0.0', commit: 'abc1234' });
    await checkForNewBuild();
    expect(getUpdateStatus()).toBe('available');
    expect(getOfferedVersion()).toBe('build:99.0.0+abc1234');
  });

  it('ignores a missing or malformed version.json', async () => {
    respondWith({ detail: 'Not Found' }, 404);
    await checkForNewBuild();
    respondWith({ version: 1 });
    await checkForNewBuild();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<!doctype html>', { status: 200 }));
    await checkForNewBuild();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    await checkForNewBuild();
    expect(getUpdateStatus()).toBe('none');
  });

  it('does not offer a build the user already dismissed', async () => {
    localStorage.setItem('dismissed_update', 'build:99.0.0+abc1234');
    respondWith({ version: '99.0.0', commit: 'abc1234' });
    await checkForNewBuild();
    expect(getUpdateStatus()).toBe('none');
  });
});
