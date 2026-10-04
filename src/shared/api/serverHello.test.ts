import { beforeEach, describe, expect, it, vi } from 'vitest';

const load = async () => {
  vi.resetModules();
  vi.stubEnv('VITE_CLIENT_API_VERSION', '2.2.0');
  const [{ handleHelloEvent }, gate] = await Promise.all([import('./serverHello'), import('./updateGate')]);
  return { handleHelloEvent, gate };
};

describe('handleHelloEvent', () => {
  beforeEach(() => { vi.unstubAllEnvs(); });

  it('reads the versions nested in data (Go backend)', async () => {
    const { handleHelloEvent, gate } = await load();
    const event = { type: 'hello', event_id: '1', chat_id: null, data: { api_version: '2.4.0', min_client_api_version: '2.2.0', user_id: '7' } };
    expect(handleHelloEvent(event)).toBe(true);
    expect(gate.getUpdateStatus()).toBe('available');
  });

  it('reads the versions at the top level (Python backend)', async () => {
    const { handleHelloEvent, gate } = await load();
    expect(handleHelloEvent({ type: 'hello', api_version: '2.4.0', min_client_api_version: '2.3.0' })).toBe(true);
    expect(gate.getUpdateStatus()).toBe('required');
  });

  it.each([null, 'hello', [], {}, { type: 'message' }])('does not treat %j as hello', async (raw) => {
    const { handleHelloEvent, gate } = await load();
    expect(handleHelloEvent(raw)).toBe(false);
    expect(gate.getUpdateStatus()).toBe('none');
  });
});