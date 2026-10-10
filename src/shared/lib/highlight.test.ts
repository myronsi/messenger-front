import { describe, expect, it } from 'vitest';
import { splitHighlight, stripHighlight } from './highlight';

describe('splitHighlight', () => {
  it('splits an excerpt into plain and marked parts', () => {
    expect(splitHighlight('say hello to Bob!')).toEqual([
      { text: 'say ', marked: false },
      { text: 'hello', marked: true },
      { text: ' to ', marked: false },
      { text: 'Bob', marked: true },
      { text: '!', marked: false },
    ]);
  });

  it('keeps text without markers as one plain part', () => {
    expect(splitHighlight('plain')).toEqual([{ text: 'plain', marked: false }]);
    expect(splitHighlight('')).toEqual([]);
  });

  it('treats markup as text and tolerates an unclosed marker', () => {
    expect(splitHighlight('<b>x')).toEqual([
      { text: '<b>', marked: false },
      { text: 'x', marked: true },
    ]);
  });

  it('strips the markers', () => {
    expect(stripHighlight('a b c')).toBe('a b c');
  });
});
