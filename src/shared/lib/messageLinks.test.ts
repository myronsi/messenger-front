import { expect, it } from 'vitest';
import { messageLinks } from './messageLinks';

it('links only HTTP(S), preserves text, and keeps sentence punctuation outside links', () => {
  const text = 'See (https://example.com/a_(b)). Then http://example.org?q=1&x=2!\n<script>javascript:alert(1)</script>';
  const parts = messageLinks(text);
  expect(parts.map(part => part.text).join('')).toBe(text);
  expect(parts.filter(part => part.href).map(part => part.href)).toEqual(['https://example.com/a_(b)', 'http://example.org?q=1&x=2']);
});

it('keeps malformed URLs, HTML, and non-web protocols as plain text', () => {
  const text = 'https:// javascript:alert(1) ftp://example.org <b>hi</b>';
  expect(messageLinks(text)).toEqual([{ text }]);
});
