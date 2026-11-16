import { describe, expect, it } from 'vitest';
import { recentCustomReactions } from './customReactions';

describe('recent custom reactions', () => {
  it('turns the newest custom emoji into reactions', () => {
    expect(recentCustomReactions(['😀', '<:party:4>', '<a:wave:9>', '<:cat:2>'])).toEqual(['c:4', 'c:9']);
    expect(recentCustomReactions(['😀'])).toEqual([]);
  });
});
