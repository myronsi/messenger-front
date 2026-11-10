import { expect, it } from 'vitest';
import { configuredWebOrigin, publicWebOrigin } from './webOrigin';

it('prefers the configured public web origin and falls back to the page origin', () => {
  expect(configuredWebOrigin('https://chat.example/app/')).toBe('https://chat.example');
  expect(configuredWebOrigin('not a url')).toBeNull();
  expect(publicWebOrigin('https://chat.example')).toBe('https://chat.example');
  expect(publicWebOrigin('')).toBe(window.location.origin);
});
