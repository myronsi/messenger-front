import type { FetchBaseQueryError, QueryReturnValue } from '@reduxjs/toolkit/query';
import { getApiBaseUrl } from '@/shared/api/config';
import { contractFetch } from '@/shared/api/contractFetch';
import { contractQuery } from '@/shared/api/queryResult';
import { sessionFetch } from '@/shared/auth/session';

export type ImportResult<T> = QueryReturnValue<T, FetchBaseQueryError, undefined>;

const apiUrl = (path: string) => `${String(getApiBaseUrl()).replace(/\/$/, '')}${path}`;

const readBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const importFetch = <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, signal?: AbortSignal): Promise<ImportResult<T>> => (
  contractQuery(async () => {
    const response = await sessionFetch(contractFetch, new URL(apiUrl(path), window.location.origin).href, {
      method,
      credentials: 'include',
      signal,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const parsed = await readBody(response);
    return response.ok ? { data: parsed as T, response } : { error: parsed, response };
  })
);

export const errorStatus = (error: unknown) => (error as { status?: unknown } | null)?.status;
