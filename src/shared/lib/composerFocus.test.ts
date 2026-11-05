import { afterEach, expect, it, vi } from 'vitest';
import { focusComposer, isMobileKeyboardOpen } from './composerFocus';

afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); });

it('refreshes existing focus synchronously on every mobile reply/edit opening', () => {
  vi.stubGlobal('innerWidth', 390);
  const field = document.createElement('textarea');
  document.body.append(field);
  const focus = vi.spyOn(field, 'focus');
  const blur = vi.spyOn(field, 'blur');
  focusComposer(field);
  expect(field).toHaveFocus();
  expect(blur).not.toHaveBeenCalled();
  focusComposer(field);
  focusComposer(field);
  expect(blur).toHaveBeenCalledTimes(2);
  expect(focus).toHaveBeenCalledTimes(3);
  expect(field).toHaveFocus();
  expect(field).not.toBeDisabled();
});

it('does not blur a focused desktop composer', () => {
  vi.stubGlobal('innerWidth', 1024);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const field = document.createElement('textarea');
  document.body.append(field);
  field.focus();
  const blur = vi.spyOn(field, 'blur');
  focusComposer(field);
  expect(blur).not.toHaveBeenCalled();
  expect(field).toHaveFocus();
});

it('detects the mobile keyboard from a shorter visual viewport', () => {
  const viewport = { width: 391, height: 800, scale: 1, addEventListener: vi.fn() };
  vi.stubGlobal('visualViewport', viewport);
  expect(isMobileKeyboardOpen()).toBe(false);
  viewport.height = 460;
  expect(isMobileKeyboardOpen()).toBe(true);
  viewport.height = 800;
  expect(isMobileKeyboardOpen()).toBe(false);
});
