declare module 'gifenc' {
  export type Palette = number[][];
  export type ColorFormat = 'rgb565' | 'rgb444' | 'rgba4444';

  export interface QuantizeOptions {
    format?: ColorFormat;
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
  }

  export interface FrameOptions {
    palette?: Palette;
    first?: boolean;
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    repeat?: number;
    dispose?: number;
  }

  export interface GifStream {
    writeFrame: (index: Uint8Array, width: number, height: number, options?: FrameOptions) => void;
    finish: () => void;
    bytes: () => Uint8Array<ArrayBuffer>;
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifStream;
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, options?: QuantizeOptions): Palette;
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: ColorFormat): Uint8Array;
}
