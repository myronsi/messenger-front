import { compressImageForUpload } from './compressImage';

interface Request { id: number; file: File }

self.addEventListener('message', (event: MessageEvent<Request>) => {
  const { id, file } = event.data;
  compressImageForUpload(file).then(
    (out) => self.postMessage({ id, file: out, changed: out !== file }),
    () => self.postMessage({ id, file, changed: false }),
  );
});
