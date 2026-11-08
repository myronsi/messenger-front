import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NotificationSettingsPanel from './NotificationSettingsPanel';
import { enableNotificationDevice } from '@/shared/lib/notifications/device';
import { loadNotifications, saveNotifications } from '@/shared/lib/notifications/api';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/lib/notifications/api', () => ({
  subscribeNotifications: () => () => undefined,
  notificationSnapshot: () => state,
  loadNotifications: vi.fn(async () => state),
  saveNotifications: vi.fn(async () => undefined),
}));
vi.mock('@/shared/lib/notifications/device', () => ({
  notificationDeviceEnabled: () => false, notificationSupported: () => true,
  enableNotificationDevice: vi.fn(async () => undefined), disableNotificationDevice: vi.fn(async () => undefined),
}));
const state = { preferences: { enabled: true, sound: false, previews: false }, mutes: [], web_push: true, vapid_public_key: 'key' };
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it('only requests device permission after an explicit click and saves settings', async () => {
  render(<NotificationSettingsPanel isActive onBack={vi.fn()} />);
  expect(enableNotificationDevice).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Show sender and message previews'));
  await waitFor(() => expect(saveNotifications).toHaveBeenCalledWith({ enabled: true, sound: false, previews: true }));
  await waitFor(() => expect(screen.getByText('Enable on this device')).not.toBeDisabled());
  fireEvent.click(screen.getByText('Enable on this device'));
  await waitFor(() => expect(enableNotificationDevice).toHaveBeenCalledWith(state));
  expect(await screen.findByText('Saved')).toBeInTheDocument();
});
it('does not load anything while the page is hidden', () => {
  render(<NotificationSettingsPanel isActive={false} onBack={vi.fn()} />);
  expect(loadNotifications).not.toHaveBeenCalled();
});
it('points to the chat list and chat profile for muting a conversation', () => {
  render(<NotificationSettingsPanel isActive onBack={vi.fn()} />);
  expect(screen.getByText(/open its profile and select Mute/)).toBeInTheDocument();
  expect(screen.queryByText('Mute a conversation')).not.toBeInTheDocument();
});
