import { describe, expect, it } from 'vitest';
import { mergePartners } from './useChatPartners';

describe('mergePartners', () => {
  it('joins direct and group partners once each, without yourself', () => {
    const direct = [{ username: 'Bob' }, { username: 'carol' }];
    const groups = [{ username: 'bob', display_name: 'Bobby' }, { username: 'me' }, { username: 'dave' }];
    expect(mergePartners('Me', direct, groups).map((person) => person.username)).toEqual(['Bob', 'carol', 'dave']);
  });
});
