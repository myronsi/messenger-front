const REQUEST_ID = /^[A-Za-z0-9_-]{32,128}$/;

export const isQrLoginRequestId = (value: string) => REQUEST_ID.test(value);

export const qrLoginPath = (requestId: string) => `/qr/${requestId}`;

export const qrLoginRequestId = (pathname: string) => {
  const match = pathname.replace(/\/+$/, '').match(/^\/qr\/([^/]+)$/);
  return match && isQrLoginRequestId(match[1]) ? match[1] : null;
};

export const parseScannedQrCode = (raw: string, allowedOrigins: readonly string[]) => {
  const text = raw.trim();
  if (isQrLoginRequestId(text)) return text;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (!allowedOrigins.includes(url.origin) || url.username || url.password) return null;
  return qrLoginRequestId(url.pathname);
};
