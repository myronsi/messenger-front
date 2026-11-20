import { problemCode } from '@/shared/api/problem';

export type JoinError = 'not_found' | 'banned' | 'restricted' | 'too_many' | 'failed';

const statusOf = (error: unknown) => (typeof error === 'object' && error !== null && typeof (error as { status?: unknown }).status === 'number'
  ? (error as { status: number }).status : undefined);

export const joinErrorOf = (error: unknown): JoinError => {
  const status = statusOf(error);
  if (status === 404) return 'not_found';
  if (status === 429) return 'too_many';
  if (status === 403) return problemCode(error) === 'account_restricted' ? 'restricted' : 'banned';
  return 'failed';
};
