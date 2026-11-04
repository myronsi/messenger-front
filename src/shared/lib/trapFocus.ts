import type { KeyboardEvent } from 'react';

export const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key !== 'Tab') return;
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
  if (!buttons.length) return;
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
};
