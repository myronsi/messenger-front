import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import CopyableUsername from './CopyableUsername';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: { copyUsername: 'Copy username' } }) }));
vi.mock('@/shared/lib/copyText', () => ({ copyText: vi.fn(async () => true) }));
afterEach(() => vi.unstubAllGlobals());

it('clears username selection and focus after a mobile tap', async () => {
  vi.stubGlobal('innerWidth', 390);
  render(<CopyableUsername username="alice" />);
  const button = screen.getByRole('button');
  button.focus();
  const range = document.createRange();
  range.selectNodeContents(button.querySelector('span')!);
  window.getSelection()?.addRange(range);
  fireEvent.click(button, { detail: 1 });
  await waitFor(() => expect(button).not.toHaveFocus());
  expect(window.getSelection()?.toString()).toBe('');
  expect(button).toHaveClass('select-none');
});

it('preserves focus when copying through keyboard activation', async () => {
  vi.stubGlobal('innerWidth', 390);
  render(<CopyableUsername username="alice" />);
  const button = screen.getByRole('button');
  button.focus();
  fireEvent.click(button, { detail: 0 });
  await waitFor(() => expect(button.querySelector('.text-green-600')).not.toBeNull());
  expect(button).toHaveFocus();
});
