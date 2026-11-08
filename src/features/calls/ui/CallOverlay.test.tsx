import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callViewStore, maximizeCall, minimizeCall } from '../model/callView';
import { idleSession, sessionStore } from '../model/stores';
import CallOverlay from './CallOverlay';

vi.mock('./ActiveCallPanel', () => ({ default: () => <section aria-label="Call view" /> }));
vi.mock('./CallBubble', () => ({ default: () => <button type="button">Call bubble</button> }));
vi.mock('./CallAnnouncer', () => ({ default: () => null }));
vi.mock('./CallNotices', () => ({ default: () => null }));
vi.mock('./IncomingCallCard', () => ({ default: () => null }));
vi.mock('./callHooks', async () => {
  const { useStore } = await import('../model/createStore');
  const { callsStore, sessionStore: sessions } = await import('../model/stores');
  return {
    useCallsState: () => useStore(callsStore),
    useCallSession: () => useStore(sessions),
    useAccount: () => ({ userId: '1', sessionId: 's-1' }),
    useNow: () => Date.now(),
  };
});

const joinCall = (callId: string, chatId: string) => act(() => {
  sessionStore.set({ ...idleSession, callId, chatId, phase: 'connecting' });
});

describe('CallOverlay', () => {
  beforeEach(() => {
    sessionStore.set(idleSession);
    callViewStore.set({ mode: 'mini', corner: 'bottom-right', stage: null });
  });

  it('opens a new call in the full view', () => {
    render(<CallOverlay openChatId="5" />);
    expect(screen.queryByRole('region', { name: 'Call view' })).not.toBeInTheDocument();
    joinCall('10', '5');
    expect(screen.getByRole('region', { name: 'Call view' })).toBeInTheDocument();
    act(() => minimizeCall());
    expect(screen.getByRole('button', { name: 'Call bubble' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Call view' })).not.toBeInTheDocument();
  });

  it('renders the full view inside the chat area when it is available', () => {
    const stage = document.createElement('div');
    document.body.append(stage);
    callViewStore.set({ mode: 'full', corner: 'bottom-right', stage });
    render(<CallOverlay openChatId="5" />);
    joinCall('10', '5');
    expect(stage).toContainElement(screen.getByRole('region', { name: 'Call view' }));
    stage.remove();
  });

  it('minimizes when another chat is opened and stays minimized on the call chat', () => {
    const { rerender } = render(<CallOverlay openChatId="5" />);
    joinCall('10', '5');
    rerender(<CallOverlay openChatId="6" />);
    expect(callViewStore.get().mode).toBe('mini');
    rerender(<CallOverlay openChatId="5" />);
    expect(callViewStore.get().mode).toBe('mini');
  });

  it('keeps the full view while the same chat stays open', () => {
    const { rerender } = render(<CallOverlay openChatId="5" />);
    joinCall('10', '5');
    rerender(<CallOverlay openChatId="5" />);
    expect(callViewStore.get().mode).toBe('full');
  });

  it('shrinks the full view into the bubble before the bubble appears', () => {
    const runs: { frames: Keyframe[]; finish: () => void }[] = [];
    const animate = vi.fn((frames: Keyframe[]) => {
      const animation = { onfinish: null as null | (() => void), cancel: vi.fn() };
      runs.push({ frames, finish: () => animation.onfinish?.() });
      return animation;
    });
    Object.assign(HTMLElement.prototype, { animate });
    try {
      callViewStore.set({ mode: 'full', corner: 'bottom-right', stage: null });
      render(<CallOverlay openChatId="5" />);
      joinCall('10', '5');
      act(() => minimizeCall());
      expect(screen.getByRole('region', { name: 'Call view' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Call bubble' })).not.toBeInTheDocument();
      const shrink = runs[runs.length - 1];
      expect(shrink.frames[1]).toMatchObject({ opacity: 0, borderRadius: '50%' });
      act(() => shrink.finish());
      expect(screen.queryByRole('region', { name: 'Call view' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Call bubble' })).toBeInTheDocument();
      act(() => maximizeCall());
      const grow = runs[runs.length - 1];
      expect(grow.frames[0]).toMatchObject({ opacity: 0, borderRadius: '50%' });
      expect(grow.frames[1]).toMatchObject({ opacity: 1, transform: 'translate(0px, 0px) scale(1)' });
    } finally {
      delete (HTMLElement.prototype as { animate?: unknown }).animate;
    }
  });
});
