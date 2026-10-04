import { describe, expect, it } from 'vitest';
import { getMetaPath } from './metaPath';

describe('getMetaPath', () => {
  it.each([
    ['http://127.0.0.1:8000', '/api/v2/meta'],
    ['https://chat.example.com/', '/api/v2/meta'],
    ['', '/api/v2/meta'],
    [undefined, '/api/v2/meta'],
    ['https://chat.example.com/api', '/v2/meta'],
    ['/api/', '/v2/meta'],
    ['https://chat.example.com/api/v2', '/meta'],
    ['/api/v2//', '/meta'],
  ])('base %j -> %s', (base, expected) => {
    expect(getMetaPath(base)).toBe(expected);
  });
});