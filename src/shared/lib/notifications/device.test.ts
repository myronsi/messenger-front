import { beforeEach, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => {
  const listeners = new Map<string, (value: unknown) => void>();
  return {
    listeners,
    addListener: vi.fn(async (name: string, callback: (value: unknown) => void) => { listeners.set(name, callback); }),
    createChannel: vi.fn(async () => undefined),
    requestPermissions: vi.fn(async () => ({ receive: 'granted' })),
    checkPermissions: vi.fn(async () => ({ receive: 'granted' })),
    register: vi.fn(async () => { listeners.get('registration')?.({ value: 'device-token' }); }),
    unregister: vi.fn(async () => undefined),
    removeAllDeliveredNotifications: vi.fn(async () => undefined),
  };
});
const request = vi.hoisted(() => vi.fn(async () => ({ id: 'device-id' })));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: native }));
vi.mock('@/shared/auth/session', () => ({ getAccessToken: () => 'access' }));
vi.mock('./api', () => ({ notificationAccount: () => '1', notificationRequest: request }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); native.listeners.clear(); localStorage.clear(); });
it('initializes native channels without prompting for permission', async () => {
  const device = await import('./device'); await device.startNativeNotifications();
  expect(native.requestPermissions).not.toHaveBeenCalled();
  expect(native.createChannel).toHaveBeenCalledWith(expect.objectContaining({ id: 'messages-silent', importance: 2, vibration: false }));
});
it('registers after an explicit request and clears delivered notifications when disabled', async () => {
  const device = await import('./device');
  await device.enableNotificationDevice({
    android_push: true, ios_push: false, web_push: false, vapid_public_key: '', mutes: [],
    preferences: { enabled: true, sound: false, previews: false },
  });
  expect(request).toHaveBeenCalledWith('/me/notification-devices', 'POST', { platform: 'android', destination: 'device-token' });
  expect(device.notificationDeviceEnabled()).toBe(true);
  await device.disableNotificationDevice();
  expect(native.removeAllDeliveredNotifications).toHaveBeenCalled(); expect(native.unregister).toHaveBeenCalled();
  expect(device.notificationDeviceEnabled()).toBe(false);
});
