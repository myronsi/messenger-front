import type { Id } from '@/shared/lib/ids';

// Tests write ids as small numbers for readability: tid(3) is the server id '3', tid(-3) the local
// (unsent) id 'local-3'; nid turns them back for assertions.
export const tid = (n: number): Id => (n < 0 ? `local${n}` : String(n));

export const nid = (id: Id): number => (id.startsWith('local') ? Number(id.slice('local'.length)) : Number(id));
