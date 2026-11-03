import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './copyText';

afterEach(() => vi.unstubAllGlobals());

describe('copyText', () => {
  it('uses the clipboard when it is allowed', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyText('@ann')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('@ann');
  });

  it('falls back to a selection copy when the clipboard is refused', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) } });
    const execCommand = vi.fn(() => true);
    Object.assign(document, { execCommand });
    expect(await copyText('@ann')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });
});
