import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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

beforeEach(() => vi.stubGlobal('innerWidth', 390));
afterEach(() => vi.unstubAllGlobals());

it('closes the selection with the back button and stays in the chat', () => {
  const { clear, view } = setup(false);
  view.rerender({ active: true });
  expect(view.result.current.location.state).toEqual({ chatName: 'alice', selection: true });
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
  const closeSearch = vi.fn();
  const closeSelection = vi.fn();
  const view = renderHook(({ search, select }) => {
    useBackToClose(search, closeSearch, 'search');
    useBackToClose(select, closeSelection, 'selection');
    return { location: useLocation(), navigate: useNavigate() };
  }, { wrapper, initialProps: { search: false, select: false } });
  view.rerender({ search: true, select: false });
  view.rerender({ search: true, select: true });
  expect(view.result.current.location.state).toEqual({ chatName: 'alice', search: true, selection: true });
  act(() => view.result.current.navigate(-1));
  expect(closeSelection).toHaveBeenCalledOnce();
  expect(closeSearch).not.toHaveBeenCalled();
  act(() => view.result.current.navigate(-1));
  expect(closeSearch).toHaveBeenCalledOnce();
  expect(view.result.current.location.pathname).toBe('/chat/7');
});

it('closing a lower panel keeps the upper one open and back skips the stale entry', () => {
  const closeSearch = vi.fn();
  const closeSelection = vi.fn();
  const view = renderHook(({ search, select }) => {
    useBackToClose(select, closeSelection, 'selection');
    useBackToClose(search, closeSearch, 'search');
    return { location: useLocation(), navigate: useNavigate() };
  }, { wrapper, initialProps: { search: false, select: false } });
  view.rerender({ search: false, select: true });
  view.rerender({ search: true, select: true });
  view.rerender({ search: true, select: false });
  expect(closeSearch).not.toHaveBeenCalled();
  expect(view.result.current.location.state).toMatchObject({ search: true });
  act(() => view.result.current.navigate(-1));
  expect(closeSearch).toHaveBeenCalledOnce();
  expect(view.result.current.location.state).toEqual({ chatName: 'alice' });
  act(() => view.result.current.navigate(-1));
  expect(view.result.current.location.pathname).toBe('/');
});
