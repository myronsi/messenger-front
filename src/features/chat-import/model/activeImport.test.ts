import { describe, expect, it } from 'vitest';
import { formatImportPercent, importPercent } from './activeImport';

describe('importPercent', () => {
  it('rounds down to one decimal and never reaches 100 before the end', () => {
    expect(importPercent(425, 1000)).toBe(42.5);
    expect(importPercent(1, 3)).toBe(33.3);
    expect(importPercent(29, 100)).toBe(29);
    expect(importPercent(99999, 100000)).toBe(99.9);
    expect(importPercent(5, 5)).toBe(100);
    expect(importPercent(7, 5)).toBe(100);
    expect(importPercent(3, 0)).toBe(0);
  });
});

describe('formatImportPercent', () => {
  it('writes the percent the way each language does', () => {
    expect(formatImportPercent(425, 1000, 'en-US')).toBe('42.5%');
    expect(formatImportPercent(425, 1000, 'de-DE')).toBe('42,5 %');
    expect(formatImportPercent(425, 1000, 'ru-RU')).toBe('42,5 %');
    expect(formatImportPercent(425, 1000, 'es-ES')).toBe('42,5 %');
  });

  it('drops a zero decimal', () => {
    expect(formatImportPercent(58, 100, 'en-US')).toBe('58%');
    expect(formatImportPercent(0, 0, 'en-US')).toBe('0%');
    expect(formatImportPercent(1, 1, 'en-US')).toBe('100%');
  });
});
