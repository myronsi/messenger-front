import { expect, it } from 'vitest';
import { isCodeProvider, moveItem, providerName, readConnectionResult } from './providers';

it('reads the result the backend appends after a provider sign-in', () => {
  expect(readConnectionResult('?provider=github&result=connected')).toEqual({ provider: 'github', result: 'connected' });
  expect(readConnectionResult('?provider=steam&result=limit')).toEqual({ provider: 'steam', result: 'limit' });
  expect(readConnectionResult('?provider=github&result=hacked')).toBeNull();
  expect(readConnectionResult('?result=connected')).toBeNull();
  expect(readConnectionResult('')).toBeNull();
});

it('moves one item and leaves the input alone', () => {
  const items = ['a', 'b', 'c'];
  expect(moveItem(items, 0, 2)).toEqual(['b', 'c', 'a']);
  expect(moveItem(items, 2, 1)).toEqual(['a', 'c', 'b']);
  expect(moveItem(items, 0, 5)).toEqual(['a', 'b', 'c']);
  expect(items).toEqual(['a', 'b', 'c']);
});

it('names providers and tells the code providers apart', () => {
  expect(providerName('youtube')).toBe('YouTube');
  expect(providerName('tiktok')).toBe('TikTok');
  expect(providerName('future')).toBe('future');
  expect(isCodeProvider('mastodon')).toBe(true);
  expect(isCodeProvider('github')).toBe(false);
});
