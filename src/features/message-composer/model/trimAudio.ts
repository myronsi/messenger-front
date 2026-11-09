import { createAudioContext } from '@/entities/message';

const TARGET_RATE = 24000;
export const MIN_TRIM_SECONDS = 1;

export interface TrimRange {
  start: number;
  end: number;
}

export const isTrimmed = (range: TrimRange | null | undefined, duration: number) => (
  !!range && (range.start > 0.05 || range.end < duration - 0.05)
);

export const encodeWav = (samples: Float32Array, sampleRate: number) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return new Blob([buffer], { type: 'audio/wav' });
};

export const trimAudio = async (audio: Blob, range: TrimRange): Promise<Blob> => {
  const context = createAudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await audio.arrayBuffer());
  } finally {
    void context.close();
  }
  const start = Math.max(0, Math.min(range.start, decoded.duration));
  const length = Math.max(0, Math.min(range.end, decoded.duration) - start);
  if (length < MIN_TRIM_SECONDS) throw new Error('Recording is too short after cutting');
  const offline = new OfflineAudioContext(1, Math.ceil(length * TARGET_RATE), TARGET_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0, start, length);
  const rendered = await offline.startRendering();
  return encodeWav(rendered.getChannelData(0), TARGET_RATE);
};
