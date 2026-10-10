import type { Id } from '@/shared/lib/ids';

// The usernames of the users the app has loaded, by id. Socket events name users by id (presence, typing,
// reads); the screens key some state by username. The mappers (toUser, the chat mappers) fill it, so every
// user on screen is known here.
const usernames = new Map<Id, string>();

export const rememberUser = (id: Id | null | undefined, username: string | null | undefined) => {
  if (id && username) usernames.set(id, username);
};

export const usernameOf = (id: Id | null | undefined): string | undefined => (id ? usernames.get(id) : undefined);
