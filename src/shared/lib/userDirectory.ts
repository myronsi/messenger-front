import type { Id } from '@/shared/lib/ids';

// The usernames of the users the app has loaded, by id. Socket events name users by id (presence, typing,
// reads); the screens key some state by username. The mappers (toUser, the chat mappers) fill it, so every
// user on screen is known here.
const usernames = new Map<Id, string>();
const idsByUsername = new Map<string, Id>();

export const rememberUser = (id: Id | null | undefined, username: string | null | undefined) => {
  if (!id || !username) return;
  usernames.set(id, username);
  idsByUsername.set(username.toLowerCase(), id);
};

export const usernameOf = (id: Id | null | undefined): string | undefined => (id ? usernames.get(id) : undefined);

export const userIdOf = (username: string | null | undefined): Id | undefined => (username ? idsByUsername.get(username.toLowerCase()) : undefined);
