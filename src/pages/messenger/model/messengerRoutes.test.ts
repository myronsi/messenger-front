import { expect, it } from 'vitest';
import { parseDmIdentifier } from './messengerRoutes';

it('preserves decimal chat IDs above the JavaScript integer limit in deep links', () => {
  expect(parseDmIdentifier('/dm/9007199254740993')?.value).toBe('9007199254740993');
});
