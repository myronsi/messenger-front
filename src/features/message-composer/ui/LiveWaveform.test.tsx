import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LiveWaveform from './LiveWaveform';

describe('LiveWaveform', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('adds a bar from the microphone level on the right and keeps the older ones to its left', () => {
    vi.useFakeTimers();
    let loudness = 128;
    const close = vi.fn(async () => undefined);
    vi.stubGlobal('AudioContext', class {
      createMediaStreamSource() { return { connect: vi.fn(), disconnect: vi.fn() }; }
      createAnalyser() { return { fftSize: 0, getByteTimeDomainData: (samples: Uint8Array) => samples.fill(loudness) }; }
      close = close;
    });
    const { unmount } = render(<LiveWaveform stream={{} as MediaStream} />);
    act(() => { vi.advanceTimersByTime(90); });
    loudness = 176;
    act(() => { vi.advanceTimersByTime(90); });
    const bars = screen.getByTestId('live-waveform').querySelectorAll('span');
    expect(bars).toHaveLength(2);
    expect(bars[0].style.height).toBe('12%');
    expect(bars[1].style.height).toBe('100%');
    unmount();
    expect(close).toHaveBeenCalled();
  });
});
