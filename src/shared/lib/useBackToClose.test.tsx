import { act, render, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BackToClose } from '@/shared/ui/BackToClose';
import { useBackToClose } from './useBackToClose';

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={['/', { pathname: '/chat/7', state: { chatName: 'alice' } }]} initialIndex={1}>{children}</MemoryRouter>;

const setup = (initial: boolean) => {
  const clear = vi.fn();
  const view = renderHook(({ active }) => {
    useBackToClose(active, clear, 'selection');
    return { location: useLocation(), navigate: useNavigate() };
  }, { wrapper, initialProps: { active: initial } });
  return { clear, view };
};

const twoPanels = () => {
  const closeSearch = vi.fn();
  const closeSelection = vi.fn();
  const view = renderHook(({ search, select }) => {
    useBackToClose(select, closeSelection, 'selection');
    useBackToClose(search, closeSearch, 'search');
    return { location: useLocation(), navigate: useNavigate() };
  }, { wrapper, initialProps: { search: false, select: false } });
  return { view, closeSearch, closeSelection };
};

beforeEach(() => vi.stubGlobal('innerWidth', 390));
afterEach(() => vi.unstubAllGlobals());

it('closes the selection with the back button and stays in the chat', () => {
  const { clear, view } = setup(false);
  view.rerender({ active: true });
  expect(view.result.current.location.state).toEqual({ chatName: 'alice', selection: expect.any(String) });
  act(() => view.result.current.navigate(-1));
  expect(clear).toHaveBeenCalledOnce();
  expect(view.result.current.location.pathname).toBe('/chat/7');
  expect(view.result.current.location.state).toEqual({ chatName: 'alice' });
});

it('removes its history entry when the selection is closed another way', () => {
  const { clear, view } = setup(false);
  view.rerender({ active: true });
  view.rerender({ active: false });
  expect(view.result.current.location.state).toEqual({ chatName: 'alice' });
  act(() => view.result.current.navigate(-1));
  expect(view.result.current.location.pathname).toBe('/');
  expect(clear).not.toHaveBeenCalled();
});

it('leaves desktop history alone', () => {
  vi.stubGlobal('innerWidth', 1280);
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
  const { view } = setup(false);
  view.rerender({ active: true });
  expect(view.result.current.location.state).toEqual({ chatName: 'alice' });
});

it('stacks two panels so each back press closes the top one', () => {
  const { view, closeSearch, closeSelection } = twoPanels();
  view.rerender({ search: true, select: false });
  view.rerender({ search: true, select: true });
  expect(view.result.current.location.state).toEqual({ chatName: 'alice', search: expect.any(String), selection: expect.any(String) });
  act(() => view.result.current.navigate(-1));
  expect(closeSelection).toHaveBeenCalledOnce();
  expect(closeSearch).not.toHaveBeenCalled();
  act(() => view.result.current.navigate(-1));
  expect(closeSearch).toHaveBeenCalledOnce();
  expect(view.result.current.location.pathname).toBe('/chat/7');
});

it('closing a lower panel keeps the upper one open and back skips the stale entry', () => {
  const { view, closeSearch } = twoPanels();
  view.rerender({ search: false, select: true });
  view.rerender({ search: true, select: true });
  view.rerender({ search: true, select: false });
  expect(closeSearch).not.toHaveBeenCalled();
  expect(view.result.current.location.state).toMatchObject({ search: expect.any(String) });
  act(() => view.result.current.navigate(-1));
  expect(closeSearch).toHaveBeenCalledOnce();
  expect(view.result.current.location.state).toEqual({ chatName: 'alice' });
  act(() => view.result.current.navigate(-1));
  expect(view.result.current.location.pathname).toBe('/');
});

it('clears a selection that was reopened while search stayed open', () => {
  const { view, closeSearch, closeSelection } = twoPanels();
  view.rerender({ search: false, select: true });
  view.rerender({ search: true, select: true });
  view.rerender({ search: true, select: false });
  view.rerender({ search: true, select: true });
  act(() => view.result.current.navigate(-1));
  expect(closeSelection).toHaveBeenCalledOnce();
  expect(closeSearch).not.toHaveBeenCalled();
});

it('removes its history entry when the panel unmounts while open', () => {
  const close = vi.fn();
  let current: { location: ReturnType<typeof useLocation>; navigate: ReturnType<typeof useNavigate> } | null = null;
  const Probe = () => { current = { location: useLocation(), navigate: useNavigate() }; return null; };
  const Panel = () => { useBackToClose(true, close, 'imageViewer'); return null; };
  const tree = (shown: boolean) => wrapper({ children: <><Probe />{shown && <Panel />}</> });
  const view = render(tree(true));
  expect(current!.location.state).toEqual({ chatName: 'alice', imageViewer: expect.any(String) });
  view.rerender(tree(false));
  expect(current!.location.state).toEqual({ chatName: 'alice' });
  act(() => current!.navigate(-1));
  expect(current!.location.pathname).toBe('/');
  expect(close).not.toHaveBeenCalled();
});

it('leaves history alone when the browser already moved to another entry before the panel unmounts', () => {
  const close = vi.fn();
  let current: { location: ReturnType<typeof useLocation> } | null = null;
  const Probe = () => { current = { location: useLocation() }; return null; };
  const Panel = () => { useBackToClose(true, close, 'imageViewer'); return null; };
  const tree = (shown: boolean) => wrapper({ children: <><Probe />{shown && <Panel />}</> });
  const view = render(tree(true));
  const opened = current!.location.state;
  window.history.replaceState({ key: 'logged-out' }, '');
  try {
    view.rerender(tree(false));
    expect(current!.location.state).toEqual(opened);
  } finally {
    window.history.replaceState(null, '');
  }
});

it('does nothing outside a router', () => {
  expect(() => render(<BackToClose onClose={vi.fn()} flag="imageViewer" />)).not.toThrow();
});
