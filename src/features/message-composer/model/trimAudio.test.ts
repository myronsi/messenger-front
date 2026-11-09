import { describe, expect, it } from 'vitest';
import { encodeWav, isTrimmed } from './trimAudio';

describe('trimAudio', () => {
  it('writes a 16-bit mono WAV file', async () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 0.5]), 24000);
    const view = new DataView(await wav.arrayBuffer());
    const text = (offset: number) => String.fromCharCode(...new Uint8Array(view.buffer, offset, 4));
    expect(wav.type).toBe('audio/wav');
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(view.getUint32(24, true)).toBe(24000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(8);
    expect([0, 1, 2, 3].map((index) => view.getInt16(44 + index * 2, true))).toEqual([0, 32767, -32768, 16383]);
  });

  it('treats the full length as not cut', () => {
    expect(isTrimmed(null, 10)).toBe(false);
    expect(isTrimmed({ start: 0, end: 10 }, 10)).toBe(false);
    expect(isTrimmed({ start: 0.5, end: 10 }, 10)).toBe(true);
    expect(isTrimmed({ start: 0, end: 8 }, 10)).toBe(true);
  });
});
