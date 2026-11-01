import { expect, it } from 'vitest';
import { resolveMediaUrl } from './resolveMediaUrl';

it('resolves the bundled group picture against the frontend instead of the API prefix', () => {
  expect(resolveMediaUrl('/static/avatars/group.png')).toBe(new URL('/static/avatars/group.png', window.location.origin).href);
});
