import { createRequestHandler, errorCode, type ImportReply, type ImportRequest } from '../archive/importRequests';

interface Envelope {
  id: number;
  request: ImportRequest;
}

const handle = createRequestHandler();

const trustedOrigin = (origin: string) => origin === '' || origin === self.location.origin;

const isEnvelope = (data: unknown): data is Envelope => {
  const value = data as Partial<Envelope> | null;
  return !!value && Number.isInteger(value.id) && !!value.request && typeof value.request.type === 'string';
};

const reply = (message: ImportReply) => self.postMessage(message);

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!trustedOrigin(event.origin) || !isEnvelope(event.data)) return;
  const { id, request } = event.data;
  handle(request).then(
    (result) => reply({ id, result }),
    (error: unknown) => reply({ id, error: errorCode(error) }),
  );
});
