import { publicApiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';

type Schema = components['schemas'];

export type PublicLinkResult =
  | { kind: 'user'; user: Schema['PublicUser'] }
  | { kind: 'group'; group: Schema['PublicGroup'] }
  | { kind: 'unavailable' }
  | { kind: 'limited' }
  | { kind: 'failed' };

const failure = (status: number): PublicLinkResult => (status === 429 ? { kind: 'limited' } : { kind: 'failed' });

export const loadPublicName = async (name: string, signal?: AbortSignal): Promise<PublicLinkResult> => {
  const { data, response } = await publicApiClient.GET('/public/names/{public_name}', { params: { path: { public_name: name } }, signal });
  if (!response.ok || !data) return failure(response.status);
  if (data.kind === 'user' && data.user) return { kind: 'user', user: data.user };
  if (data.kind === 'group' && data.group) return { kind: 'group', group: data.group };
  return { kind: 'unavailable' };
};

export const loadPublicInvite = async (token: string, signal?: AbortSignal): Promise<PublicLinkResult> => {
  const { data, response } = await publicApiClient.GET('/public/invites/{token}', { params: { path: { token } }, signal });
  if (response.status === 404) return { kind: 'unavailable' };
  if (!response.ok || !data) return failure(response.status);
  return { kind: 'group', group: data };
};
