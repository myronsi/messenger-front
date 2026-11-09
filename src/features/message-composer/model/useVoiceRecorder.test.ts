import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { trimAudio } from './trimAudio';
import { recordedMs, useVoiceRecorder } from './useVoiceRecorder';

vi.mock('@/shared/api/uploadWithProgress', () => ({ uploadWithProgress: vi.fn() }));
vi.mock('./trimAudio', () => ({ trimAudio: vi.fn(async () => new Blob(['cut'], { type: 'audio/wav' })) }));

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

  const startRecorder = async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: vi.fn(async () => stream) } });
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.mocked(uploadWithProgress).mockReset().mockResolvedValue({});
    const onVoiceUploadStart = vi.fn(() => -1);
    const hook = renderHook(() => useVoiceRecorder({ chatId: '3', isDisabled: false, disableVoice: false, onVoiceUploadStart }));
    await act(async () => { await hook.result.current.handleStartRecording(); });
    now.mockReturnValue(4200);
    return { ...hook, onVoiceUploadStart };
  };

  it('keeps a stopped recording for listening instead of sending it', async () => {
    const { result } = await startRecorder();
    await act(async () => { result.current.stopRecording({ preview: true }); });
    expect(uploadWithProgress).not.toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.preview).toMatchObject({ url: 'blob:preview', seconds: 4.2 });
  });

  it('sends the recording that was listened to', async () => {
    const { result, onVoiceUploadStart } = await startRecorder();
    await act(async () => { result.current.stopRecording({ preview: true }); });
    await act(async () => { result.current.sendPreview(); });
    expect(onVoiceUploadStart).toHaveBeenCalledWith(expect.any(Blob), 'voice_message.webm', 'voice');
    expect(uploadWithProgress).toHaveBeenCalledOnce();
    expect(result.current.preview).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('sends only the part that was kept as a WAV file', async () => {
    const { result, onVoiceUploadStart } = await startRecorder();
    await act(async () => { result.current.stopRecording({ preview: true }); });
    act(() => result.current.setPreviewTrim({ start: 1, end: 3 }));
    expect(result.current.preview?.trim).toEqual({ start: 1, end: 3 });
    await act(async () => { await result.current.sendPreview(); });
    expect(onVoiceUploadStart).toHaveBeenCalledWith(expect.objectContaining({ type: 'audio/wav' }), 'voice_message.wav', 'voice');
  });

  it('does not send a recording deleted while it is being cut', async () => {
    const { result, onVoiceUploadStart } = await startRecorder();
    await act(async () => { result.current.stopRecording({ preview: true }); });
    act(() => result.current.setPreviewTrim({ start: 1, end: 3 }));
    let finishCut!: (blob: Blob) => void;
    vi.mocked(trimAudio).mockReturnValueOnce(new Promise((resolve) => { finishCut = resolve; }));
    let sending!: Promise<void>;
    act(() => { sending = result.current.sendPreview(); });
    act(() => result.current.discardPreview());
    await act(async () => { finishCut(new Blob(['cut'], { type: 'audio/wav' })); await sending; });
    expect(onVoiceUploadStart).not.toHaveBeenCalled();
    expect(uploadWithProgress).not.toHaveBeenCalled();
  });

  it('throws a recording away without sending it', async () => {
    const { result } = await startRecorder();
    await act(async () => { result.current.stopRecording({ preview: true }); });
    act(() => result.current.discardPreview());
    expect(result.current.preview).toBeNull();
    expect(uploadWithProgress).not.toHaveBeenCalled();
  });
});
