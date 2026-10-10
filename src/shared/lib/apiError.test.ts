import { describe, expect, it } from 'vitest';
import { apiErrorCode, apiErrorMessage, errorFromResponse } from './apiError';

const problem = (body: object) => ({ status: 400, data: body });

describe('apiErrorMessage', () => {
  it('prefers the detail, then the first field error, then the fallback over the title', () => {
    expect(apiErrorMessage(problem({ title: 'Bad', detail: 'Name taken', code: 'conflict' }), 'x')).toBe('Name taken');
    expect(apiErrorMessage(problem({ title: 'Bad', errors: [{ field: 'username', message: 'too short' }] }), 'x')).toBe('too short');
    expect(apiErrorMessage(problem({ title: 'Unauthorized', code: 'invalid_credentials' }), 'Login failed')).toBe('Login failed');
    expect(apiErrorMessage(problem({ title: 'Unauthorized' }), '')).toBe('Unauthorized');
  });

  it('falls back when there is no problem body', () => {
    expect(apiErrorMessage({ status: 'FETCH_ERROR', error: 'TypeError' }, 'Offline')).toBe('Offline');
    expect(apiErrorMessage(new Error('boom'), 'Failed')).toBe('Failed');
    expect(apiErrorMessage('boom', 'Failed')).toBe('Failed');
  });
});

describe('apiErrorCode', () => {
  it('reads the stable code', () => {
    expect(apiErrorCode(problem({ code: 'invalid_credentials' }))).toBe('invalid_credentials');
    expect(apiErrorCode(new Error('x'))).toBeUndefined();
  });
});

describe('errorFromResponse', () => {
  it('parses a problem+json response', async () => {
    const response = new Response(JSON.stringify({ title: 'Not found', code: 'not_found', status: 404 }), {
      status: 404,
      headers: { 'Content-Type': 'application/problem+json' },
    });
    const error = await errorFromResponse(response);
    expect(error.status).toBe(404);
    expect(apiErrorCode(error)).toBe('not_found');
  });

  it('survives a body that is not JSON', async () => {
    const error = await errorFromResponse(new Response('<html>', { status: 502 }));
    expect(error).toEqual({ status: 502, data: undefined });
  });
});
