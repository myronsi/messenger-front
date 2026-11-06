import { describe, expect, it } from 'vitest';
import { ApiProblem, problemCode, problemDetail } from './problem';

describe('problemCode', () => {
  it('reads the code from a raw problem, an RTK error and a wrapped problem', () => {
    expect(problemCode({ code: 'two_factor_required' })).toBe('two_factor_required');
    expect(problemCode({ status: 401, data: { code: 'invalid_two_factor_code', detail: 'Wrong code' } })).toBe('invalid_two_factor_code');
    const wrapped = new ApiProblem(401, { code: 'invalid_credentials', detail: 'Check your password' }, 'Failed');
    expect(problemCode(wrapped)).toBe('invalid_credentials');
    expect(problemDetail(wrapped)).toBe('Check your password');
    expect(wrapped.message).toBe('Failed');
  });

  it('returns nothing for plain errors', () => {
    expect(problemCode(new Error('offline'))).toBeUndefined();
    expect(problemCode(null)).toBeUndefined();
  });
});
