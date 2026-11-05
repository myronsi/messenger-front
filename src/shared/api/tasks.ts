import type { FetchBaseQueryError, QueryReturnValue } from '@reduxjs/toolkit/query';

class ContractProblem extends Error {
  constructor(readonly status: number, readonly data: unknown) { super('The server rejected this request.'); }
}

export const contractData = <T>(result: { data?: T; error?: unknown; response: Response }): T => {
  if (!result.response.ok) throw new ContractProblem(result.response.status, result.error);
  return result.data as T;
};

export const apiTask = async <T>(task: () => Promise<T>): Promise<QueryReturnValue<T, FetchBaseQueryError, undefined>> => {
  try { return { data: await task() }; }
  catch (error) {
    return { error: error instanceof ContractProblem ? { status: error.status, data: error.data }
      : { status: 'FETCH_ERROR', error: 'Unable to reach the server.' } };
  }
};

export const collectPages = async <T>(read: (after?: string) => Promise<{ items: T[]; next_cursor?: string | null }>): Promise<T[]> => {
  const items: T[] = [], seen = new Set<string>();
  let after: string | undefined;
  do {
    const page = await read(after);
    items.push(...page.items);
    after = page.next_cursor || undefined;
    if (after && seen.has(after)) throw new Error('Repeated pagination cursor');
    if (after) seen.add(after);
  } while (after);
  return items;
};
