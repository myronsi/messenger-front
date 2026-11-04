export const pictureRect = (image: HTMLImageElement) => {
  const box = image.getBoundingClientRect();
  const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight) || 0;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const left = box.left + (box.width - width) / 2;
  const top = box.top + (box.height - height) / 2;
  return { left, top, right: left + width, bottom: top + height };
};

export const isOnPicture = (images: (HTMLImageElement | null)[], x: number, y: number) => images.some((image) => {
  if (!image?.naturalWidth) return false;
  const rect = pictureRect(image);
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
});
