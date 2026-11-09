import { fetchMedia } from '@/shared/api/fetchMedia';
import { drawnFileName, flattenDrawing, type Drawing } from '@/shared/ui/drawing';

const clickLink = (href: string, filename: string, newTab = false) => {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = href;
  link.download = filename;
  if (newTab) {
    link.target = '_blank';
    link.rel = 'noreferrer';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadImage = async (url: string, filename: string, drawing?: Drawing | null) => {
  try {
    const response = await fetchMedia(url, { credentials: 'include' });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(drawing?.items.length ? await flattenDrawing(blob, drawing) : blob);
    clickLink(objectUrl, drawing?.items.length ? drawnFileName(filename) : filename);
    URL.revokeObjectURL(objectUrl);
  } catch {
    clickLink(url, filename, true);
  }
};
