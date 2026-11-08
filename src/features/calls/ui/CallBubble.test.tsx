import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callViewStore } from '../model/callView';
import { idleSession, type CallSession } from '../model/stores';
import CallBubble from './CallBubble';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    translations: new Proxy({}, {
      get: (_target, key) => ({ callExpand: 'Show call', callMuted: 'Muted', callBubbleWarning: 'Security warning' } as Record<string, string>)[String(key)]
        ?? String(key),
    }),
  }),
}));
vi.mock('./callHooks', () => ({
  useCallTitle: () => ({ title: 'Bob', caller: 'Bob' }),
  useCallAvatar: () => '',
  useNow: () => Date.parse('2026-11-07T10:01:05Z'),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => null }));

const session: CallSession = { ...idleSession, callId: '10', phase: 'connected', muted: true };
const call = { started_at: '2026-11-07T10:00:00Z' } as Parameters<typeof CallBubble>[0]['call'];
const bubble = () => screen.getByRole('button', { name: /^Bob/ });

describe('CallBubble', () => {
  beforeEach(() => {
    Object.assign(window, { innerWidth: 1000, innerHeight: 800 });
    callViewStore.set({ mode: 'mini', corner: 'bottom-right', stage: null });
    Object.assign(HTMLElement.prototype, { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn(), hasPointerCapture: () => true });
  });
  afterEach(() => window.localStorage.clear());

  it('shows the timer and state and maximizes on a tap', () => {
    render(<CallBubble call={call} session={session} userId="1" />);
    expect(bubble()).toHaveAccessibleName('Bob · 1:05 · Muted · Show call');
    expect(bubble()).toHaveStyle({ left: '920px', top: '640px' });
    fireEvent.click(bubble());
    expect(callViewStore.get().mode).toBe('full');
  });

  it('follows the pointer while dragged, snaps to the nearest corner and does not maximize', () => {
    render(<CallBubble call={call} session={session} userId="1" />);
    fireEvent.pointerDown(bubble(), { button: 0, pointerId: 1, clientX: 950, clientY: 670 });
    fireEvent.pointerMove(bubble(), { pointerId: 1, clientX: 400, clientY: 300 });
    expect(bubble()).toHaveStyle({ left: '370px', top: '270px' });
    act(() => {
      fireEvent.pointerMove(bubble(), { pointerId: 1, clientX: 120, clientY: 120 });
      fireEvent.pointerUp(bubble(), { pointerId: 1, clientX: 120, clientY: 120 });
    });
    fireEvent.click(bubble());
    expect(callViewStore.get()).toMatchObject({ mode: 'mini', corner: 'top-left' });
    expect(bubble()).toHaveStyle({ left: '16px', top: '80px' });
  });

  it('treats a tiny movement as a tap', () => {
    render(<CallBubble call={call} session={session} userId="1" />);
    fireEvent.pointerDown(bubble(), { button: 0, pointerId: 1, clientX: 950, clientY: 670 });
    fireEvent.pointerMove(bubble(), { pointerId: 1, clientX: 953, clientY: 672 });
    fireEvent.pointerUp(bubble(), { pointerId: 1, clientX: 953, clientY: 672 });
    fireEvent.click(bubble());
    expect(callViewStore.get().mode).toBe('full');
  });

  it('moves between corners with the arrow keys', () => {
    render(<CallBubble call={call} session={session} userId="1" />);
    fireEvent.keyDown(bubble(), { key: 'ArrowUp' });
    expect(callViewStore.get().corner).toBe('top-right');
    fireEvent.keyDown(bubble(), { key: 'ArrowLeft' });
    expect(callViewStore.get().corner).toBe('top-left');
  });

  it('flags a hidden security warning', () => {
    render(<CallBubble call={call} session={{ ...session, muted: false, keyChanges: ['2'] }} userId="1" />);
    expect(bubble()).toHaveAccessibleName('Bob · 1:05 · Security warning · Show call');
  });
});
