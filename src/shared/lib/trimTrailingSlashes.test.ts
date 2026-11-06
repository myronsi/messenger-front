import { describe, expect, it } from 'vitest';
import { trimTrailingSlashes } from './trimTrailingSlashes';

describe('trimTrailingSlashes', () => {
  it('removes every trailing slash and keeps the rest', () => {
    expect(trimTrailingSlashes('https://chat.example.com/api/v2///')).toBe('https://chat.example.com/api/v2');
    expect(trimTrailingSlashes('/qr/abc/')).toBe('/qr/abc');
  });

  it('leaves values without trailing slashes unchanged', () => {
    expect(trimTrailingSlashes('/api/v2')).toBe('/api/v2');
    expect(trimTrailingSlashes('')).toBe('');
  });

  it('turns a value made only of slashes into an empty string', () => {
    expect(trimTrailingSlashes('///')).toBe('');
  });

  it('stays fast on long runs of slashes', () => {
    const value = `a${'/'.repeat(100_000)}b${'/'.repeat(100_000)}`;
    expect(trimTrailingSlashes(value)).toBe(`a${'/'.repeat(100_000)}b`);
  });
});
