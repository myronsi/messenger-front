import { afterEach, describe, expect, it, vi } from 'vitest';

const patch = vi.fn(async (..._args: unknown[]) => ({ error: undefined }));
vi.mock('./client', () => ({ apiClient: { PATCH: (...args: unknown[]) => patch(...args) } }));

const { deviceTimeZone, resetTimeZoneSync, syncTimeZone } = await import('./syncTimeZone');

afterEach(() => {
  patch.mockClear();
  resetTimeZoneSync();
});

describe('syncTimeZone', () => {
  it('sends the device zone once when it differs from the stored one', async () => {
    const zone = deviceTimeZone();
    expect(zone).toBeTruthy();
    expect(await syncTimeZone(zone)).toBe(false);
    expect(patch).not.toHaveBeenCalled();

    expect(await syncTimeZone('Antarctica/Troll')).toBe(zone !== 'Antarctica/Troll');
    expect(patch).toHaveBeenCalledWith('/me', { body: { time_zone: zone } });
    expect(await syncTimeZone('Antarctica/Troll')).toBe(false);
    expect(patch).toHaveBeenCalledTimes(1);
  });
});
