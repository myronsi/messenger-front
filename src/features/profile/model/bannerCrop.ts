export const needsBannerCrop = (file: File) => file.type.startsWith('image/') && file.type !== 'image/gif';
