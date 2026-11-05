import { act, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

export const longPress = (element: HTMLElement) => {
  fireEvent.touchStart(element, { touches: [{ clientX: 10, clientY: 10 }] });
  act(() => { vi.advanceTimersByTime(500); });
  fireEvent.touchEnd(element);
  fireEvent.click(element);
};
