import { configureStore } from '@reduxjs/toolkit';
import { waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { userApi } from './userApi';

const mocks = vi.hoisted(() => ({ request: vi.fn(), profile: vi.fn() }));
vi.mock('@/shared/api/users', () => ({
  resolveUsername: async () => ({ id: '1' }),
  userProfileByUsername: (...args: unknown[]) => mocks.profile(...args),
}));
vi.mock('@/shared/api/client', () => ({ apiClient: {
  PUT: (...args: unknown[]) => mocks.request(...args),
  DELETE: (...args: unknown[]) => mocks.request(...args),
} }));
vi.mock('@/shared/api/baseApi', async () => {
  const { createApi } = await import('@reduxjs/toolkit/query/react');
  return { messengerApi: createApi({
    reducerPath: 'testApi', baseQuery: mocks.request,
    tagTypes: ['User', 'Chat', 'Message', 'Avatar', 'Auth', 'Privacy'], endpoints: () => ({}),
  }) };
});

afterEach(() => vi.clearAllMocks());

it.each(['rename', 'reset'] as const)('shows %s immediately, keeps the server result, and restores the original on failure', async mode => {
  const original = { id: '1', username: 'alice', display_name: 'Old nickname', contact_display_name: 'Old nickname', account_display_name: 'Alice' };
  const store = configureStore({
    reducer: { [userApi.reducerPath]: userApi.reducer },
    middleware: getDefault => getDefault().concat(userApi.middleware),
  });
  const select = () => userApi.endpoints.getUserByUsername.select('alice')(store.getState()).data;
  const updated = { ...original, display_name: mode === 'rename' ? 'New nickname' : 'Alice', contact_display_name: mode === 'rename' ? 'New nickname' : null };
  try {
    for (const success of [true, false]) {
      await store.dispatch(userApi.util.upsertQueryData('getUserByUsername', 'alice', original));
      await store.dispatch(userApi.endpoints.getUserByUsername.initiate('alice'));
      let finish!: (result: unknown) => void;
      mocks.profile.mockResolvedValue(success ? updated : original);
      mocks.request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
      const pending = mode === 'rename'
        ? store.dispatch(userApi.endpoints.updateContactDisplayName.initiate({ username: 'alice', displayName: 'New nickname' }))
        : store.dispatch(userApi.endpoints.deleteContactDisplayName.initiate('alice'));
      expect(select()?.display_name).toBe(updated.display_name);
      expect(select()?.contact_display_name).toBe(updated.contact_display_name);
      await waitFor(() => expect(finish).toBeTypeOf('function'));
      finish(success ? { response: { ok: true }, data: {
        ...updated, display_name: updated.account_display_name, contact_name: updated.contact_display_name,
      } } : { response: { ok: false, status: 500 }, error: {} });
      await pending;
      expect(select()?.display_name).toBe(success ? updated.display_name : original.display_name);
      expect(select()?.contact_display_name).toBe(success ? updated.contact_display_name : original.contact_display_name);
    }
  } finally {
    store.dispatch(userApi.util.resetApiState());
  }
});
