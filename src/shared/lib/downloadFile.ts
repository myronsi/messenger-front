import { fetchMedia } from '@/shared/api/fetchMedia';

const saveBlob = (href: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const readWithProgress = async (response: Response, onProgress?: (percent: number | null) => void) => {
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body?.getReader();
  if (!reader) return response.blob();
  const chunks: BlobPart[] = [];
  let received = 0;
  onProgress?.(total ? 0 : null);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total) onProgress?.(Math.min(100, (received / total) * 100));
  }
  return new Blob(chunks);
};

interface DownloadOptions {
  onProgress?: (percent: number | null) => void;
  signal?: AbortSignal;
}

export const downloadFile = async (fileUrl: string, fileName: string, options: DownloadOptions = {}) => {
  const downloadUrl = fileUrl.includes('?') ? `${fileUrl}&download=1` : `${fileUrl}?download=1`;
  try {
    const response = await fetchMedia(downloadUrl, { method: 'GET', credentials: 'include', headers: { Accept: '*/*' }, signal: options.signal });
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
    const blob = await readWithProgress(response, options.onProgress);
    const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }));
    saveBlob(url, fileName);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (options.signal?.aborted) return;
    console.error('Download failed:', error);
    saveBlob(fileUrl, fileName);
  }
};
