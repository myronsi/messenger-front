import { describe, expect, it } from 'vitest';
import { trimChars, trimEndChars, trimLineEnds } from './trimChars';

describe('trimChars', () => {
  it('matches the regular expressions it replaces', () => {
    const samples = ['__a_b__', '___', '', 'abc', '-x-', 'a==', 'ab=', 'abc', 'x\0\0', 'go.', 'go!?\u2019', 'a.b'];
    for (const sample of samples) {
      expect(trimChars(sample, '_')).toBe(sample.replace(/^_+|_+$/g, ''));
      expect(trimChars(sample, '-')).toBe(sample.replace(/^-+|-+$/g, ''));
      expect(trimEndChars(sample, '=')).toBe(sample.replace(/=+$/, ''));
      expect(trimEndChars(sample, '\0')).toBe(sample.replace(/\0+$/g, ''));
      expect(trimEndChars(sample, '.,!?;:\'\u2019\u201d')).toBe(sample.replace(/[.,!?;:'\u2019\u201d]+$/, ''));
    }
  });

  it('removes spaces and tabs at the end of every line and keeps line breaks', () => {
    const text = 'one  \ntwo\t \r\n  three\n\nfour \t';
    expect(trimLineEnds(text)).toBe(text.replace(/[ \t]+(?=\r?$)/gm, ''));
    expect(trimLineEnds(text)).toBe('one\ntwo\r\n  three\n\nfour');
  });

  it('stays fast on long runs that do not reach the end', () => {
    const long = `${'_'.repeat(50_000)}x`;
    const started = performance.now();
    expect(trimChars(long, '_')).toBe('x');
    expect(trimLineEnds(`${' '.repeat(50_000)}x`)).toBe(`${' '.repeat(50_000)}x`);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
