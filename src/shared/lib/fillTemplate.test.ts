import { expect, it } from 'vitest';
import { fillTemplate } from './fillTemplate';

it('fills every placeholder once and keeps names literal', () => {
  expect(fillTemplate('{actor} added {target}', { actor: 'Cost $&', target: 'Max' })).toBe('Cost $& added Max');
  expect(fillTemplate('{actor} added {target}', { actor: 'Ann {target}', target: 'Max' })).toBe('Ann {target} added Max');
  expect(fillTemplate('{actor} and {other}', { actor: 'Ann' })).toBe('Ann and {other}');
});
