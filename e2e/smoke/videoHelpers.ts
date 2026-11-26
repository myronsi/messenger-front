import { expect, type Page } from '@playwright/test';
import { FAKE_MEDIA_ARGS, callPanel } from './callHelpers';

export const VIDEO_MEDIA_ARGS = [
  ...FAKE_MEDIA_ARGS, '--enable-features=RunVideoCaptureServiceInBrowserProcess', '--auto-select-desktop-capture-source=Entire screen', '--auto-accept-this-tab-capture',
];

export const VIDEO_PERMISSIONS = ['microphone', 'camera'];

export interface VideoSample {
  width: number;
  height: number;
  framesPerSecond: number;
  variance: number;
}

export const remoteVideo = (source: 'camera' | 'screen') => `video[data-video-source="${source}"]:not([data-local])`;

export const sampleVideos = (page: Page, selector: string) => page.evaluate(async (query) => {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(query));
  const frames = (video: HTMLVideoElement) => video.getVideoPlaybackQuality().totalVideoFrames;
  const before = videos.map(frames);
  await new Promise((resolve) => { setTimeout(resolve, 1_000); });
  return videos.map((video, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    let variance = 0;
    if (video.videoWidth > 0) {
      context.drawImage(video, 0, 0, 32, 32);
      const data = context.getImageData(0, 0, 32, 32).data;
      const lum: number[] = [];
      for (let i = 0; i < data.length; i += 4) lum.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const mean = lum.reduce((sum, value) => sum + value, 0) / lum.length;
      variance = lum.reduce((sum, value) => sum + (value - mean) ** 2, 0) / lum.length;
    }
    return { width: video.videoWidth, height: video.videoHeight, framesPerSecond: frames(video) - before[index], variance };
  });
}, selector);

export const playingVideos = async (page: Page, selector: string, count: number) => {
  let last: VideoSample[] = [];
  await expect.poll(async () => {
    last = await sampleVideos(page, selector);
    return last.length === count && last.every((video) => video.width > 0 && video.framesPerSecond >= 3 && video.variance > 5);
  }, { timeout: 30_000 }).toBe(true).catch((error: unknown) => {
    process.stdout.write(`[calls] videos when playing failed: ${JSON.stringify(last)}\n`);
    throw error;
  });
  return last;
};

export const noVideo = async (page: Page, selector: string) => {
  await expect.poll(async () => (await sampleVideos(page, selector)).filter((video) => video.width > 0).length, { timeout: 15_000 }).toBe(0);
};

export const toggleCamera = (page: Page, on: boolean) => callPanel(page).getByRole('button', { name: on ? 'Turn camera on' : 'Turn camera off' }).click();

export const startSharing = (page: Page) => callPanel(page).getByRole('button', { name: 'Share screen' }).click();
