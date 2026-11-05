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

  it('cleans up and restores focus even if the fallback copy throws', async () => {
    vi.stubGlobal('navigator', {});
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    Object.assign(document, { execCommand: () => { throw new Error('denied'); } });
    expect(await copyText('@ann')).toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
    expect(window.getSelection()?.toString()).toBe('');
    expect(button).toHaveFocus();
    button.remove();
  });
});
