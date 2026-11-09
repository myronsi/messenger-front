export const SKIP_SECONDS = 5;
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export interface VideoPrefs { volume: number; muted: boolean; rate: number }
const PREFS_KEY = 'messenger.videoPlayer';
const DEFAULT_PREFS: VideoPrefs = { volume: 1, muted: false, rate: 1 };

export const readVideoPrefs = (): VideoPrefs => {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as Partial<VideoPrefs>;
    return {
      volume: typeof saved.volume === 'number' ? Math.min(1, Math.max(0, saved.volume)) : DEFAULT_PREFS.volume,
      muted: typeof saved.muted === 'boolean' ? saved.muted : DEFAULT_PREFS.muted,
      rate: typeof saved.rate === 'number' && SPEEDS.includes(saved.rate) ? saved.rate : DEFAULT_PREFS.rate,
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

export const saveVideoPrefs = (video: HTMLVideoElement) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ volume: video.volume, muted: video.muted, rate: video.playbackRate }));
  } catch {
    return;
  }
};

export const applyVideoPrefs = (video: HTMLVideoElement) => {
  const prefs = readVideoPrefs();
  video.volume = prefs.volume;
  video.muted = prefs.muted;
  video.playbackRate = prefs.rate;
};

export const formatVideoTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};

export const togglePlayback = (video: HTMLVideoElement) => {
  if (video.paused || video.ended) void video.play()?.catch(() => {});
  else video.pause();
};

export const seekBy = (video: HTMLVideoElement, seconds: number) => {
  const end = Number.isFinite(video.duration) ? video.duration : video.currentTime + Math.max(0, seconds);
  video.currentTime = Math.min(end, Math.max(0, video.currentTime + seconds));
};

export const setVolume = (video: HTMLVideoElement, volume: number) => {
  video.volume = Math.min(1, Math.max(0, volume));
  video.muted = video.volume === 0;
};

export const toggleMute = (video: HTMLVideoElement) => {
  if (video.muted || video.volume === 0) {
    video.muted = false;
    if (video.volume === 0) video.volume = 1;
  } else {
    video.muted = true;
  }
};

export const stepSpeed = (video: HTMLVideoElement, direction: -1 | 1) => {
  const current = SPEEDS.findIndex(rate => rate >= video.playbackRate);
  const index = Math.min(SPEEDS.length - 1, Math.max(0, (current < 0 ? SPEEDS.length - 1 : current) + direction));
  video.playbackRate = SPEEDS[index];
};

const isControl = (target: EventTarget | null) => target instanceof HTMLInputElement || target instanceof HTMLButtonElement;

export const handleVideoKey = (event: KeyboardEvent, media: Element | null) => {
  if (!(media instanceof HTMLVideoElement)) return false;
  if (event.target instanceof HTMLInputElement && event.target.type === 'range' && event.key.startsWith('Arrow')) return true;
  if (isControl(event.target) && (event.key === ' ' || event.key === 'Enter')) return false;
  const actions: Record<string, () => void> = {
    ' ': () => togglePlayback(media),
    k: () => togglePlayback(media),
    m: () => toggleMute(media),
    j: () => seekBy(media, -SKIP_SECONDS),
    l: () => seekBy(media, SKIP_SECONDS),
    '<': () => stepSpeed(media, -1),
    '>': () => stepSpeed(media, 1),
  };
  const action = actions[/^[a-z]$/i.test(event.key) ? event.key.toLowerCase() : event.key];
  if (!action) return false;
  event.preventDefault();
  action();
  return true;
};
