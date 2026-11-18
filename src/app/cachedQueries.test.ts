import { expect, it } from 'vitest';
import '@/features/profile';
import '@/features/connections';
import '@/features/moderation';
import '@/entities/user';
import { messengerApi } from '@/shared/api/baseApi';
import { cachedQueryEndpoints } from './cachedQueries';

it('lists only query endpoints that exist', () => {
  const endpoints = messengerApi.endpoints as Record<string, { useQuery?: unknown } | undefined>;
  const missing = cachedQueryEndpoints.filter(name => !endpoints[name]?.useQuery);
  expect(missing).toEqual([]);
});
