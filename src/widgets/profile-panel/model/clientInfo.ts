import { APP_COMMIT, APP_VERSION } from '@/shared/lib/appVersion';
import { CLIENT_API_VERSION } from '@/shared/api/clientVersion';

export type ClientInfoKey =
  | 'appVersion' | 'build' | 'apiContract' | 'browser' | 'os' | 'installMode' | 'appLanguage' | 'systemLanguage'
  | 'timeZone' | 'screen' | 'window' | 'connection' | 'notifications' | 'serviceWorker';

export type InstallMode = 'native' | 'installed' | 'browser';

export interface ClientEnvironment {
  userAgent: string;
  standalone: boolean;
  native: string | null;
  systemLanguage: string;
  timeZone: string;
  screen: string;
  window: string;
  online: boolean;
  networkType: string | null;
  notifications: string;
  serviceWorker: boolean;
}

const BROWSERS: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Edge'], [/OPR\/([\d.]+)/, 'Opera'], [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
  [/Firefox\/([\d.]+)/, 'Firefox'], [/FxiOS\/([\d.]+)/, 'Firefox'], [/CriOS\/([\d.]+)/, 'Chrome'], [/Chrome\/([\d.]+)/, 'Chrome'],
];

export const browserOf = (userAgent: string) => {
  for (const [pattern, name] of BROWSERS) {
    const match = userAgent.match(pattern);
    if (match) return `${name} ${match[1].split('.')[0]}`;
  }
  const safari = userAgent.includes('Safari/') ? userAgent.match(/Version\/(\d+)/) : null;
  return safari ? `Safari ${safari[1]}` : '—';
};

export const osOf = (userAgent: string) => {
  const android = userAgent.match(/Android ([\d.]+)/);
  if (android) return `Android ${android[1]}`;
  const ios = userAgent.match(/(?:iPhone|iPad|iPod).*? OS ([\d_]+)/);
  if (ios) return `iOS ${ios[1].replace(/_/g, '.')}`;
  if (/Windows NT 10/.test(userAgent)) return 'Windows 10/11';
  if (/Windows/.test(userAgent)) return 'Windows';
  const mac = userAgent.match(/Mac OS X ([\d_]+)/);
  if (mac) return `macOS ${mac[1].replace(/_/g, '.')}`;
  if (/CrOS/.test(userAgent)) return 'ChromeOS';
  if (/Linux/.test(userAgent)) return 'Linux';
  return '—';
};

export const installModeOf = (environment: Pick<ClientEnvironment, 'native' | 'standalone'>): InstallMode => (
  environment.native ? 'native' : environment.standalone ? 'installed' : 'browser'
);

type Capacitor = { isNativePlatform?: () => boolean; getPlatform?: () => string };

export const readEnvironment = (): ClientEnvironment => {
  const capacitor = (window as unknown as { Capacitor?: Capacitor }).Capacitor;
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return {
    userAgent: navigator.userAgent,
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    native: capacitor?.isNativePlatform?.() ? capacitor.getPlatform?.() ?? 'native' : null,
    systemLanguage: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`,
    window: `${window.innerWidth}×${window.innerHeight}`,
    online: navigator.onLine,
    networkType: connection?.effectiveType ?? null,
    notifications: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
    serviceWorker: !!navigator.serviceWorker?.controller,
  };
};

export interface ClientInfoLabels {
  installModes: Record<InstallMode, string>;
  online: string;
  offline: string;
  active: string;
  inactive: string;
}

export const clientInfoRows = (environment: ClientEnvironment, appLanguage: string, labels: ClientInfoLabels): [ClientInfoKey, string][] => [
  ['appVersion', APP_VERSION],
  ['build', APP_COMMIT],
  ['apiContract', CLIENT_API_VERSION],
  ['browser', browserOf(environment.userAgent)],
  ['os', osOf(environment.userAgent)],
  ['installMode', environment.native ? `${labels.installModes.native} (${environment.native})` : labels.installModes[installModeOf(environment)]],
  ['appLanguage', appLanguage],
  ['systemLanguage', environment.systemLanguage],
  ['timeZone', environment.timeZone],
  ['screen', environment.screen],
  ['window', environment.window],
  ['connection', [environment.online ? labels.online : labels.offline, environment.networkType].filter(Boolean).join(' · ')],
  ['notifications', environment.notifications],
  ['serviceWorker', environment.serviceWorker ? labels.active : labels.inactive],
];

export const clientInfoText = (rows: [ClientInfoKey, string][], names: Record<ClientInfoKey, string>) => (
  rows.map(([key, value]) => `${names[key]}: ${value}`).join('\n')
);
