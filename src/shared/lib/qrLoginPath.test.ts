import { describe, expect, it } from 'vitest';
import { notificationReturnPath } from './notifications/navigation';
import { parseScannedQrCode, qrLoginRequestId } from './qrLoginPath';

const id = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab';
const origins = ['https://messenger.test'];

describe('parseScannedQrCode', () => {
  it('accepts a sign-in link on the app origin', () => {
    expect(parseScannedQrCode(`https://messenger.test/qr/${id}`, origins)).toBe(id);
    expect(parseScannedQrCode(`  https://messenger.test/qr/${id}/ `, origins)).toBe(id);
  });

  it('accepts a bare request id', () => {
    expect(parseScannedQrCode(id, origins)).toBe(id);
  });

  it('rejects links on other origins or other paths', () => {
    expect(parseScannedQrCode(`https://evil.test/qr/${id}`, origins)).toBeNull();
    expect(parseScannedQrCode(`http://messenger.test/qr/${id}`, origins)).toBeNull();
    expect(parseScannedQrCode(`https://messenger.test.evil.test/qr/${id}`, origins)).toBeNull();
    expect(parseScannedQrCode(`https://user:pass@messenger.test/qr/${id}`, origins)).toBeNull();
    expect(parseScannedQrCode(`https://messenger.test/chat/${id}`, origins)).toBeNull();
    expect(parseScannedQrCode(`https://messenger.test/qr/${id}/extra`, origins)).toBeNull();
    expect(parseScannedQrCode('https://messenger.test/qr/short', origins)).toBeNull();
  });

  it('rejects plain text and other codes', () => {
    expect(parseScannedQrCode('hello world', origins)).toBeNull();
    expect(parseScannedQrCode('otpauth://totp/Messenger?secret=ABC', origins)).toBeNull();
    expect(parseScannedQrCode('', origins)).toBeNull();
  });
});

describe('qr sign-in return path', () => {
  it('reads the request id from the route', () => {
    expect(qrLoginRequestId(`/qr/${id}`)).toBe(id);
    expect(qrLoginRequestId('/qr/')).toBeNull();
    expect(qrLoginRequestId('/qr/not valid')).toBeNull();
  });

  it('returns to the approval page after sign-in', () => {
    expect(notificationReturnPath(`/qr/${id}`, '')).toBe(`/qr/${id}`);
    expect(notificationReturnPath('/login', '', { notificationReturnPath: `/qr/${id}` })).toBe(`/qr/${id}`);
    expect(notificationReturnPath('/login', '', { notificationReturnPath: '/qr/bad' })).toBe('/');
  });
});
