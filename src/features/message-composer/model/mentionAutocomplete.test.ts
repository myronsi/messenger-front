import { describe, expect, it } from 'vitest';
import { applyMention, mentionQuery, suggestMentions } from './mentionAutocomplete';

const members = [
  { username: 'anna', display_name: 'Anna Keller' },
  { username: 'bob', display_name: 'Robert Brown' },
  { username: 'karl_b', display_name: 'Karl' },
  { username: 'me', display_name: 'Myself' },
];

describe('mentionQuery', () => {
  it('starts after @ at the start or after a space', () => {
    expect(mentionQuery('@', 1)).toEqual({ query: '', start: 0 });
    expect(mentionQuery('hi @an', 6)).toEqual({ query: 'an', start: 3 });
    expect(mentionQuery('hi @an there', 6)).toEqual({ query: 'an', start: 3 });
  });

  it('ignores email addresses and finished words', () => {
    expect(mentionQuery('mail@an', 7)).toBeNull();
    expect(mentionQuery('@anna ', 6)).toBeNull();
    expect(mentionQuery('no at', 5)).toBeNull();
  });
});

describe('suggestMentions', () => {
  it('ranks username starts, then display name words, then contains, and leaves out the sender', () => {
    expect(suggestMentions(members, 'b', 'me', false).map((member) => member.username)).toEqual(['bob', 'karl_b']);
    expect(suggestMentions(members, 'ke', 'me', false).map((member) => member.username)).toEqual(['anna']);
    expect(suggestMentions(members, '', 'ME', false).map((member) => member.username)).toEqual(['anna', 'bob', 'karl_b']);
  });

  it('offers @all first only to owners and admins', () => {
    expect(suggestMentions(members, 'a', 'me', true)[0]).toMatchObject({ username: 'all', all: true });
    expect(suggestMentions(members, 'a', 'me', false).some((member) => member.all)).toBe(false);
    expect(suggestMentions(members, 'an', 'me', true).some((member) => member.all)).toBe(false);
  });
});

it('replaces the typed query with the name and a space', () => {
  expect(applyMention('hi @an!', 6, { query: 'an', start: 3 }, 'anna')).toEqual({ value: 'hi @anna !', caret: 9 });
});
