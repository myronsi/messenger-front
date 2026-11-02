import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useElementHeight } from './useElementHeight';

let resize: () => void = () => {};
let height = 80;

const Probe = ({ onHeight }: { onHeight: (value: number | undefined) => void }) => {
  const [ref, value] = useElementHeight<HTMLDivElement>();
  onHeight(value);
  return <div ref={(node) => {
    if (node) node.getBoundingClientRect = () => ({ height } as DOMRect);
    ref(node);
  }} />;
};

describe('useElementHeight', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('follows the element while it grows', () => {
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback; }
      observe() {}
      disconnect() {}
    });
    const seen: (number | undefined)[] = [];
    render(<Probe onHeight={(value) => seen.push(value)} />);
    expect(seen[seen.length - 1]).toBe(80);
    height = 196;
    act(() => resize());
    expect(seen[seen.length - 1]).toBe(196);
  });
});
