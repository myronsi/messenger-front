import { getTokenSession, getTokenSubject } from './tokenClaims';

const SIGNED_IN_USER_KEY = 'signed_in_user';

interface SavedUser<User> {
  account: string;
  session: string;
  user: User;
}

export const rememberSignedInUser = <User extends { username: string }>(token: string | null, user: User) => {
  const account = getTokenSubject(token);
  const session = getTokenSession(token);
  if (!account || !session || !user.username) return;
  try {
    localStorage.setItem(SIGNED_IN_USER_KEY, JSON.stringify({ account, session, user } satisfies SavedUser<User>));
  } catch {
    return;
  }
};

export const readSignedInUser = <User extends { username: string }>(token: string | null): User | null => {
  const account = getTokenSubject(token);
  const session = getTokenSession(token);
  if (!account || !session) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(SIGNED_IN_USER_KEY) ?? 'null') as Partial<SavedUser<User>> | null;
    if (saved?.account !== account || saved.session !== session || typeof saved.user?.username !== 'string' || !saved.user.username) return null;
    return saved.user;
  } catch {
    return null;
  }
};

export const forgetSignedInUser = () => {
  try {
    localStorage.removeItem(SIGNED_IN_USER_KEY);
  } catch {
    return;
  }
};
