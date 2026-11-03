import { describe, expect, it } from 'vitest';
import { recordedMs } from './useVoiceRecorder';

describe('recordedMs', () => {
  it('leaves paused time out of the recorded length', () => {
    expect(recordedMs({ startedAt: 0, pausedMs: 4000, pausedAt: null }, 4200)).toBe(200);
  });

  it('also leaves out a pause that is still going on', () => {
    expect(recordedMs({ startedAt: 0, pausedMs: 0, pausedAt: 200 }, 5000)).toBe(200);
  });
});
