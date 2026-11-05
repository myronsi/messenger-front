import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { copyText } from '@/shared/lib/copyText';
import { LinkedMessageText } from './LinkedMessageText';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {
  openLink: 'Open link', copyLink: 'Copy link', copyLinkFailed: 'Try again',
  externalLinkTitle: 'Open external link?', externalLinkDescription: 'This link takes you outside Messenger.', cancel: 'Cancel',
} }) }));
vi.mock('@/shared/lib/copyText', () => ({ copyText: vi.fn(async () => true) }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); vi.restoreAllMocks(); });

it('opens a link-specific menu on a touch hold and consumes the release click', () => {
  vi.useFakeTimers();
  const parent = vi.fn();
  render(<div onTouchStart={parent} onContextMenu={parent} onClick={parent}><LinkedMessageText text="Visit https://example.com." /></div>);
  const link = screen.getByRole('link');
  expect(link).toHaveAttribute('href', 'https://example.com');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  fireEvent.touchStart(link, { touches: [{ clientX: 40, clientY: 50 }] });
  fireEvent.pointerDown(link, { pointerType: 'touch', pointerId: 1, clientX: 40, clientY: 50 });
  act(() => { vi.advanceTimersByTime(701); });
  expect(screen.getByRole('menuitem', { name: 'Open link' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeInTheDocument();
  fireEvent.pointerUp(link, { pointerType: 'touch', pointerId: 1 });
  expect(fireEvent.click(link)).toBe(false);
  expect(parent).not.toHaveBeenCalled();
});

it('copies the URL from its context menu', async () => {
  render(<LinkedMessageText text="http://example.com/path" />);
  fireEvent.contextMenu(screen.getByRole('link'), { clientX: 40, clientY: 50 });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }));
  await waitFor(() => expect(copyText).toHaveBeenCalledWith('http://example.com/path'));
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
});

it('cancels long-press when the finger moves to scroll', () => {
  vi.useFakeTimers();
  render(<LinkedMessageText text="https://example.com" />);
  const link = screen.getByRole('link');
  fireEvent.pointerDown(link, { pointerType: 'touch', pointerId: 1 });
  fireEvent.pointerMove(link, { pointerType: 'touch', pointerId: 1, clientY: 100 });
  act(() => { vi.advanceTimersByTime(701); });
  expect(screen.queryByRole('menu')).toBeNull();
});

it('consumes the outside gesture without opening another message menu, then allows a fresh tap', async () => {
  const other = vi.fn();
  render(<><LinkedMessageText text="https://example.com" /><button onClick={other} onContextMenu={other}>Other message</button></>);
  const target = screen.getByRole('button', { name: 'Other message' });
  fireEvent.contextMenu(screen.getByRole('link'), { clientX: 40, clientY: 50 });
  expect(screen.getByRole('menu')).toBeInTheDocument();
  fireEvent.pointerDown(target, { pointerId: 2, pointerType: 'touch' });
  fireEvent.touchStart(target, { touches: [{ clientX: 100, clientY: 100 }] });
  fireEvent.contextMenu(target);
  fireEvent.pointerUp(target, { pointerId: 2, pointerType: 'touch' });
  fireEvent.click(target);
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  expect(other).not.toHaveBeenCalled();
  fireEvent.pointerDown(target, { pointerId: 3, pointerType: 'touch' });
  fireEvent.pointerUp(target, { pointerId: 3, pointerType: 'touch' });
  fireEvent.click(target);
  expect(other).toHaveBeenCalledOnce();
});

it('requires confirmation on a normal link tap and allows cancellation without navigation', async () => {
  const navigate = vi.spyOn(window, 'open').mockReturnValue(null);
  render(<LinkedMessageText text="https://example.com/path" />);
  const link = screen.getByRole('link');
  expect(fireEvent.click(link)).toBe(false);
  expect(screen.getByRole('dialog')).toHaveTextContent('https://example.com/path');
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(navigate).not.toHaveBeenCalled();
  expect(link).toHaveFocus();
});

it('also requires confirmation for the link menu Open action', async () => {
  const navigate = vi.spyOn(window, 'open').mockReturnValue(null);
  render(<LinkedMessageText text="https://example.com/path" />);
  fireEvent.contextMenu(screen.getByRole('link'), { clientX: 40, clientY: 50 });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Open link' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Open link' }));
  expect(navigate).toHaveBeenCalledExactlyOnceWith('https://example.com/path', '_blank', 'noopener,noreferrer');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
