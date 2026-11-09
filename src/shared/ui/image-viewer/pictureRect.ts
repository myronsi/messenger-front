export type ViewerMedia = HTMLImageElement | HTMLVideoElement;

export const naturalSize = (media: ViewerMedia) => media instanceof HTMLVideoElement
  ? { width: media.videoWidth, height: media.videoHeight }
  : { width: media.naturalWidth, height: media.naturalHeight };

export const pictureRect = (media: ViewerMedia) => {
  const box = media.getBoundingClientRect();
  const natural = naturalSize(media);
  const scale = Math.min(box.width / natural.width, box.height / natural.height) || 0;
  const width = natural.width * scale;
  const height = natural.height * scale;
  const left = box.left + (box.width - width) / 2;
  const top = box.top + (box.height - height) / 2;
  return { left, top, right: left + width, bottom: top + height };
};

export const isOnPicture = (media: (ViewerMedia | null)[], x: number, y: number) => media.some((item) => {
  if (!item || !naturalSize(item).width) return false;
  const rect = pictureRect(item);
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
});
