import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NotificationSettingsPanel from './NotificationSettingsPanel';
import { enableNotificationDevice } from '@/shared/lib/notifications/device';
import { muteNotifications, saveNotifications } from '@/shared/lib/notifications/api';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));
vi.mock('@/shared/lib/notifications/api', () => ({
  subscribeNotifications: () => () => undefined,
  notificationSnapshot: () => state,
  loadNotifications: vi.fn(async () => state),
  saveNotifications: vi.fn(async () => undefined),
  muteNotifications: vi.fn(async () => undefined),
  notificationRequest: vi.fn(async () => ({ items: [{ id: '7', name: 'Project group' }] })),
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
});
it('mutes the selected conversation for the selected duration', async () => {
  render(<NotificationSettingsPanel isActive onBack={vi.fn()} />);
  await screen.findByText('Project group');
  fireEvent.change(screen.getByLabelText('Conversation'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '8h' } });
  fireEvent.click(screen.getByText('Apply'));
  await waitFor(() => expect(muteNotifications).toHaveBeenCalledWith('7', '8h'));
});
