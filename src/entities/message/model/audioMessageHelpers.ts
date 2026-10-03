export const formatAudioTime = (time: number | undefined): string => {
  if (!time || !Number.isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const WAVEFORM_BAR_COUNT = 38;
export const FALLBACK_WAVEFORM = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
  const wave = Math.sin(index * 0.75) * 0.24 + Math.sin(index * 1.7) * 0.12;
  return Math.min(0.9, Math.max(0.22, 0.46 + wave));
});

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const createAudioContext = () => new (window.AudioContext || window.webkitAudioContext!)();

export const analyzeAudio = async (url: string): Promise<{ duration: number; waveform: number[] }> => {
  const audioContext = createAudioContext();
  try {
    const response = await fetch(url, { method: 'GET', mode: 'cors', credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch audio');
    const audioBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.max(1, Math.floor(channelData.length / WAVEFORM_BAR_COUNT));
    const rawBars = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, barIndex) => {
      const start = barIndex * samplesPerBar;
      const end = barIndex === WAVEFORM_BAR_COUNT - 1
        ? channelData.length
        : Math.min(channelData.length, start + samplesPerBar);
      let sum = 0;
      let count = 0;
      const step = Math.max(1, Math.floor((end - start) / 120));
      for (let sampleIndex = start; sampleIndex < end; sampleIndex += step) {
        const sample = channelData[sampleIndex] || 0;
        sum += sample * sample;
        count += 1;
      }
      return count ? Math.sqrt(sum / count) : 0;
    });
    const peak = Math.max(...rawBars, 0.001);
    return {
      duration: audioBuffer.duration,
      waveform: rawBars.map((value) => Math.min(1, Math.max(0.16, value / peak))),
    };
  } finally {
    await audioContext.close();
  }
};

export const isValidWaveform = (waveform: unknown): waveform is number[] => (
  Array.isArray(waveform) &&
  waveform.length > 0 &&
  waveform.every((value) => typeof value === 'number' && Number.isFinite(value))
);

export const getAudioDuration = async (url: string): Promise<number> => {
  const audioContext = createAudioContext();
  try {
    const response = await fetch(url, { method: 'GET', mode: 'cors', credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch audio');
    const audioBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
    return audioBuffer.duration;
  } catch {
    return 0;
  } finally {
    await audioContext.close();
  }
};
