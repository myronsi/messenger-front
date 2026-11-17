export const WAVEFORM_BARS = 64;

export const summarizePeaks = (samples: Float32Array, bars = WAVEFORM_BARS) => {
  if (!samples.length) return Array<number>(bars).fill(0.3);
  const size = Math.max(1, Math.floor(samples.length / bars));
  const peaks = Array.from({ length: bars }, (_, bar) => {
    let peak = 0;
    const from = bar * size;
    const to = Math.min(samples.length, from + size);
    for (let index = from; index < to; index += 1) peak = Math.max(peak, Math.abs(samples[index]));
    return peak;
  });
  const loudest = Math.max(...peaks);
  return loudest > 0 ? peaks.map((peak) => peak / loudest) : peaks.map(() => 0.3);
};

type AudioContextClass = typeof AudioContext;

export const readWaveform = async (file: Blob, bars = WAVEFORM_BARS): Promise<{ peaks: number[]; duration: number } | null> => {
  const Context = (globalThis as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass }).AudioContext
    ?? (globalThis as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
  if (!Context) return null;
  const context = new Context();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    return { peaks: summarizePeaks(buffer.getChannelData(0), bars), duration: buffer.duration };
  } catch {
    return null;
  } finally {
    void context.close();
  }
};

export const clipStartAt = (pointerRatio: number, grabRatio: number, clipRatio: number) => (
  Math.min(1 - clipRatio, Math.max(0, pointerRatio - grabRatio))
);
