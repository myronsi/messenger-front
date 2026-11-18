import { compressImageForUpload } from './compressImage';

interface Request { id: number; file: File }

const trustedOrigin = (origin: string) => origin === '' || origin === self.location.origin;

const isRequest = (data: unknown): data is Request => {
  const value = data as Partial<Request> | null;
  return !!value && Number.isInteger(value.id) && value.file instanceof File;
};

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!trustedOrigin(event.origin) || !isRequest(event.data)) return;
  const { id, file } = event.data;
  compressImageForUpload(file).then(
    (out) => self.postMessage({ id, file: out, changed: out !== file }),
    () => self.postMessage({ id, file, changed: false }),
  );
});
