import { describe, expect, it } from 'vitest';
import { compareVersions, parseVersion } from './apiVersion';

describe('parseVersion', () => {
  it.each(['1.0.0', '2.4.0', '2.0.0-alpha.1', '2.0.0-alpha.1.next.29', '1.0.0+build.5'])('accepts %s', (value) => {
    expect(parseVersion(value)).not.toBeNull();
  });

  it.each(['', '1', '1.0', 'v1.0.0', '1.0.0.0', 'latest', null, undefined, 7])('rejects %j', (value) => {
    expect(parseVersion(value)).toBeNull();
  });
});

describe('compareVersions', () => {
  it.each([
    ['1.0.0', '1.0.0', 0],
    ['1.0.1', '1.0.0', 1],
    ['1.2.0', '1.10.0', -1],
    ['2.0.0', '1.99.99', 1],
    ['2.0.0-alpha.1', '2.0.0', -1],
    ['2.0.0-alpha.2', '2.0.0-alpha.1', 1],
    ['2.0.0-alpha.1.next.29', '2.0.0-alpha.1', 1],
    ['2.0.0-alpha.10', '2.0.0-alpha.9', 1],
    ['2.0.0-9', '2.0.0-1a', -1],
    ['2.0.0-1a', '2.0.0-9', 1],
    ['2.0.0-alpha.9007199254740993', '2.0.0-alpha.9007199254740992', 1],
    ['2.0.0-alpha.1', '2.0.0-alpha.1.0', -1],
  ])('compares %s with %s', (a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
  });

  it('returns null when a value is not a version', () => {
    expect(compareVersions('abc', '1.0.0')).toBeNull();
    expect(compareVersions('1.0.0', undefined)).toBeNull();
  });
});