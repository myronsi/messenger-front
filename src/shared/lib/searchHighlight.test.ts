import { expect, it } from 'vitest';
import { splitByQuery } from './searchHighlight';

it('keeps match offsets when lower-casing changes the text length', () => {
  expect(splitByQuery('İstanbul foo', 'foo')).toEqual([{ text: 'İstanbul ', match: false }, { text: 'foo', match: true }]);
});

it('treats regex characters in the query literally and ignores case', () => {
  expect(splitByQuery('Price (USD) 5.00 price', 'price').filter((part) => part.match).map((part) => part.text)).toEqual(['Price', 'price']);
  expect(splitByQuery('a.b axb', 'a.b').filter((part) => part.match).map((part) => part.text)).toEqual(['a.b']);
  expect(splitByQuery('call (555)', '(555)').filter((part) => part.match).map((part) => part.text)).toEqual(['(555)']);
});
