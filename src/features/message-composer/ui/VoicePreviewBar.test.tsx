import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VoicePreviewBar from './VoicePreviewBar';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: new Proxy({}, { get: (_target, key) => String(key) }), language: 'en' }),
}));
vi.mock('@/entities/message', () => ({
  analyzeAudio: vi.fn(async () => ({ duration: 10, waveform: Array.from({ length: 10 }, () => 0.5) })),
  formatAudioTime: (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`,
}));

const preview = { blob: new Blob(['voice']), url: 'blob:preview', seconds: 4, trim: null };

describe('VoicePreviewBar', () => {
  it('plays the recording and shows its length', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    render(<VoicePreviewBar preview={preview} onDiscard={vi.fn()} onTrim={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByText('0:10')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('voicePreviewPlay'));
    expect(play).toHaveBeenCalled();
  });

  it('seeks when the waveform is tapped', async () => {
    render(<VoicePreviewBar preview={preview} onDiscard={vi.fn()} onTrim={vi.fn()} />);
    await act(async () => {});
    const slider = screen.getByLabelText('voicePreviewSeek');
    const track = slider.parentElement as HTMLElement;
    track.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(slider, { clientX: 50 });
    expect(slider).toHaveAttribute('aria-valuenow', '5');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '7');
  });

  it('cuts the recording with the grips at both ends', async () => {
    const onTrim = vi.fn();
    const { rerender } = render(<VoicePreviewBar preview={preview} onDiscard={vi.fn()} onTrim={onTrim} />);
    await act(async () => {});
    fireEvent.keyDown(screen.getByTestId('trim-start'), { key: 'ArrowRight' });
    expect(onTrim).toHaveBeenLastCalledWith({ start: 0.5, end: 10 });
    rerender(<VoicePreviewBar preview={{ ...preview, trim: { start: 2, end: 6 } }} onDiscard={vi.fn()} onTrim={onTrim} />);
    expect(screen.getByText('0:04')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId('trim-end'), { key: 'ArrowLeft' });
    expect(onTrim).toHaveBeenLastCalledWith({ start: 2, end: 5.5 });
    fireEvent.keyDown(screen.getByTestId('trim-start'), { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByTestId('trim-start'), { key: 'ArrowLeft' });
    expect(onTrim).toHaveBeenLastCalledWith({ start: 1.5, end: 6 });
  });

  it('keeps at least one second', async () => {
    const onTrim = vi.fn();
    render(<VoicePreviewBar preview={{ ...preview, trim: { start: 4, end: 5 } }} onDiscard={vi.fn()} onTrim={onTrim} />);
    await act(async () => {});
    fireEvent.keyDown(screen.getByTestId('trim-start'), { key: 'ArrowRight' });
    expect(onTrim).toHaveBeenLastCalledWith({ start: 4, end: 5 });
  });

  it('throws the recording away', () => {
    const onDiscard = vi.fn();
    render(<VoicePreviewBar preview={preview} onDiscard={onDiscard} onTrim={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('voicePreviewDelete'));
    expect(onDiscard).toHaveBeenCalled();
  });
});
