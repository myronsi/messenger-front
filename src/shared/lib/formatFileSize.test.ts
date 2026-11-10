import { describe, expect, it } from 'vitest';
import { formatFileSize } from './formatFileSize';

const en = { sizeBytes: '{size} B', sizeKilobytes: '{size} KB', sizeMegabytes: '{size} MB', sizeGigabytes: '{size} GB' };
const ru = { sizeBytes: '{size} Б', sizeKilobytes: '{size} КБ', sizeMegabytes: '{size} МБ', sizeGigabytes: '{size} ГБ' };

describe('formatFileSize', () => {
  it('picks the largest fitting unit with one decimal', () => {
    expect(formatFileSize(512, 'en', en)).toBe('512 B');
    expect(formatFileSize(1536, 'en', en)).toBe('1.5 KB');
    expect(formatFileSize(2.5 * 1024 * 1024, 'en', en)).toBe('2.5 MB');
    expect(formatFileSize(3 * 1024 ** 3, 'en', en)).toBe('3 GB');
    expect(formatFileSize(150.4 * 1024 * 1024, 'en', en)).toBe('150 MB');
  });

  it('uses the decimal separator and units of the language', () => {
    expect(formatFileSize(2.5 * 1024 * 1024, 'ru', ru)).toBe('2,5 МБ');
    expect(formatFileSize(2.5 * 1024 * 1024, 'es', en)).toBe('2,5 MB');
  });

  it('shows zero for missing sizes', () => {
    expect(formatFileSize(Number.NaN, 'en', en)).toBe('0 B');
    expect(formatFileSize(-3, 'en', en)).toBe('0 B');
  });
});
