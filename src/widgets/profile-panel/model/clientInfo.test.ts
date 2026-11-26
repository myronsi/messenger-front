import { describe, expect, it } from 'vitest';
import { browserOf, clientInfoRows, clientInfoText, installModeOf, osOf, type ClientEnvironment } from './clientInfo';

const PIXEL = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const EDGE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0';

const labels = {
  installModes: { native: 'App', installed: 'Installed web app', browser: 'Browser tab' }, online: 'Online', offline: 'Offline', active: 'Active', inactive: 'Not active',
};
const environment: ClientEnvironment = {
  userAgent: EDGE, standalone: false, native: null, systemLanguage: 'de-DE', timeZone: 'Europe/Berlin', screen: '1920×1080 @1.5x',
  window: '1280×800', online: true, networkType: '4g', notifications: 'granted', serviceWorker: true,
};

describe('client info', () => {
  it('names the browser and system from the user agent', () => {
    expect([browserOf(PIXEL), osOf(PIXEL)]).toEqual(['Chrome 142', 'Android 15']);
    expect([browserOf(IPHONE), osOf(IPHONE)]).toEqual(['Safari 18', 'iOS 18.1']);
    expect([browserOf(EDGE), osOf(EDGE)]).toEqual(['Edge 142', 'Windows 10/11']);
    expect([browserOf('curl/8'), osOf('curl/8')]).toEqual(['—', '—']);
  });

  it('tells a native app, an installed web app and a browser tab apart', () => {
    expect(installModeOf({ native: 'android', standalone: false })).toBe('native');
    expect(installModeOf({ native: null, standalone: true })).toBe('installed');
    expect(installModeOf({ native: null, standalone: false })).toBe('browser');
  });

  it('builds copyable lines with the localized names', () => {
    const rows = clientInfoRows(environment, 'English', labels);
    const names = Object.fromEntries(rows.map(([key]) => [key, key.toUpperCase()])) as Record<(typeof rows)[number][0], string>;
    const text = clientInfoText(rows, names);
    expect(text).toContain('BROWSER: Edge 142');
    expect(text).toContain('INSTALLMODE: Browser tab');
    expect(text).toContain('CONNECTION: Online · 4g');
    expect(text).toContain('SERVICEWORKER: Active');
    expect(text.split('\n')).toHaveLength(rows.length);
  });
});
