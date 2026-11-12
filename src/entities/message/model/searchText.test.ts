import { describe, expect, it } from 'vitest';
import { matchingSearchText, searchExcerpt } from './searchText';
import type { ChatSearchResult } from './types';

describe('searchExcerpt', () => {
  it('starts close to the match in a long message', () => {
    const text = `${'a'.repeat(100)} power bank here`;
    expect(searchExcerpt(text, 'power')).toBe(`…${'a'.repeat(39)} power bank here`);
  });

  it('keeps short messages whole and joins lines', () => {
    expect(searchExcerpt('bring the\npower bank', 'power')).toBe('bring the power bank');
  });
});

describe('matchingSearchText', () => {
  const file = { id: '1', sender: 'Nina', timestamp: '', type: 'file', content: { file_name: 'meeting-chime.wav', caption: 'A copy of the itinerary' } } as unknown as ChatSearchResult;

  it('shows the caption of a file when the match is there', () => {
    expect(matchingSearchText(file, 'itinerary')).toBe('A copy of the itinerary');
  });

  it('shows the file name when the match is in the name', () => {
    expect(matchingSearchText(file, 'chime')).toBe('meeting-chime.wav');
  });
});
