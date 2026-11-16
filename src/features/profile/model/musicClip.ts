export const MUSIC_CLIP_SECONDS = 30;

export const clipEnd = (start: number, duration: number) => Math.min(duration, start + MUSIC_CLIP_SECONDS);
