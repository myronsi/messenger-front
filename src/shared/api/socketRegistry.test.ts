import { describe, expect, it, vi } from 'vitest';
import { closeAllWebSockets, onCloseAllWebSockets } from './socketRegistry';

describe('closeAllWebSockets', () => {
  it('runs registered handlers until they unsubscribe', () => {
    const handler = vi.fn();
    const release = onCloseAllWebSockets(handler);
    closeAllWebSockets();
    release();
    closeAllWebSockets();
    expect(handler).toHaveBeenCalledOnce();
  });
});
