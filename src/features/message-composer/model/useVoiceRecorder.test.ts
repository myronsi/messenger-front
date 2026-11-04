import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { recordedMs, useVoiceRecorder } from './useVoiceRecorder';

vi.mock('@/shared/api/uploadWithProgress', () => ({ uploadWithProgress: vi.fn() }));

describe('recordedMs', () => {
  it('leaves paused time out of the recorded length', () => {
    expect(recordedMs({ startedAt: 0, pausedMs: 4000, pausedAt: null }, 4200)).toBe(200);
  });

  it('also leaves out a pause that is still going on', () => {
    expect(recordedMs({ startedAt: 0, pausedMs: 0, pausedAt: 200 }, 5000)).toBe(200);
  });
});

class FakeRecorder {
  static isTypeSupported = () => true;
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => Promise<void>) | null = null;
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice']) });
    void this.onstop?.();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useVoiceRecorder', () => {
  it('turns the microphone off before the voice message is uploaded', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: vi.fn(async () => stream) } });
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    let finishUpload!: () => void;
    vi.mocked(uploadWithProgress).mockReturnValue(new Promise((resolve) => { finishUpload = () => resolve({}); }));
    const { result } = renderHook(() => useVoiceRecorder({ chatId: '3', isDisabled: false, disableVoice: false, onVoiceUploadStart: () => -1 }));
    await act(async () => { await result.current.handleStartRecording(); });
    now.mockReturnValue(5000);
    act(() => result.current.stopRecording());
    expect(uploadWithProgress).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.liveStream).toBeNull();
    await act(async () => { finishUpload(); });
  });
});
