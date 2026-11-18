import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountRestrictionOf, isAccountRestricted, reportIfAccountRestricted, subscribeAccountRestricted } from './accountRestriction';

describe('account restriction signal', () => {
  const stops: Array<() => void> = [];
  afterEach(() => stops.splice(0).forEach((stop) => stop()));

  it('reports a 403 account_restricted problem with its restriction', () => {
    const listener = vi.fn();
    stops.push(subscribeAccountRestricted(listener));
    expect(reportIfAccountRestricted(403, { code: 'account_restricted', restriction: 'upload' })).toBe(true);
    expect(listener).toHaveBeenCalledWith({ restriction: 'upload' });
  });

  it('ignores other statuses and codes', () => {
    const listener = vi.fn();
    stops.push(subscribeAccountRestricted(listener));
    expect(reportIfAccountRestricted(403, { code: 'forbidden' })).toBe(false);
    expect(reportIfAccountRestricted(422, { code: 'account_restricted', restriction: 'upload' })).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('finds the restriction inside RTK and upload error shapes', () => {
    expect(accountRestrictionOf({ status: 403, data: { code: 'account_restricted', restriction: 'forward' } })).toBe('forward');
    expect(accountRestrictionOf({ status: 403, body: { code: 'account_restricted' } })).toBeNull();
    expect(isAccountRestricted({ status: 403, data: { code: 'forbidden' } })).toBe(false);
  });
});
