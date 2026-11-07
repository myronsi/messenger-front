import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissCallNotice, selectInputDevice } from './callControls';
import { idleSession, sessionStore } from './stores';

const engine = vi.hoisted(() => ({ current: null as null | { selectInput: ReturnType<typeof vi.fn> } }));

vi.mock('./callController', () => ({ currentEngine: () => engine.current }));

describe('call controls', () => {
  beforeEach(() => {
    sessionStore.set({ ...idleSession, callId: '10', phase: 'connected', input: 'mic-1' });
    engine.current = { selectInput: vi.fn(async () => undefined) };
  });

  it('passes the default device as an empty id instead of a browser specific one', async () => {
    await selectInputDevice('');
    expect(engine.current?.selectInput).toHaveBeenCalledWith('');
    expect(sessionStore.get().notice).toBeNull();
  });

  it('shows a notice when switching the microphone fails', async () => {
    engine.current?.selectInput.mockRejectedValue(new Error('OverconstrainedError'));
    await selectInputDevice('mic-2');
    expect(sessionStore.get()).toMatchObject({ notice: 'mic-failed', input: '' });
  });

  it('dismisses only the notice and keeps the other tab state', () => {
    sessionStore.set({ ...idleSession, notice: 'failed', otherTab: true });
    dismissCallNotice();
    expect(sessionStore.get()).toMatchObject({ notice: null, otherTab: true });
  });
});
