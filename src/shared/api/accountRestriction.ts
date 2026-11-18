export interface AccountRestrictionNotice {
  restriction: string | null;
}

type Listener = (notice: AccountRestrictionNotice) => void;

const listeners = new Set<Listener>();

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const restrictionOf = (body: unknown): string | null | undefined => {
  if (!record(body)) return undefined;
  if (body.code === 'account_restricted') return typeof body.restriction === 'string' ? body.restriction : null;
  return restrictionOf(body.data) ?? restrictionOf(body.problem) ?? restrictionOf(body.body);
};

export const accountRestrictionOf = (error: unknown) => restrictionOf(error);

export const isAccountRestricted = (error: unknown) => restrictionOf(error) !== undefined;

export const subscribeAccountRestricted = (listener: Listener) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const reportAccountRestricted = (restriction: string | null) => {
  listeners.forEach((listener) => listener({ restriction }));
};

export const reportIfAccountRestricted = (status: number, body: unknown) => {
  if (status !== 403) return false;
  const restriction = restrictionOf(body);
  if (restriction === undefined) return false;
  reportAccountRestricted(restriction);
  return true;
};
