import { expect, test } from '@playwright/test';
import { createEnglishContext, createSmokeUser, openProfile, registerUser } from './helpers';

test('notification preferences persist and conversations can be muted', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go notification API');
  const context = await createEnglishContext(browser);
  const page = await context.newPage();
  try {
    await registerUser(page, createSmokeUser('notify'));
    const base = process.env.E2E_API_URL!;
    const chatId = await page.evaluate(async (api) => {
      const response = await fetch(`${api}/groups`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Notification smoke chat', member_ids: [] }),
      });
      if (!response.ok) throw new Error(`Create group: ${response.status}`);
      return (await response.json()).id as string;
    }, base);
    await openProfile(page);
    await page.getByRole('button', { name: /Notifications/ }).click();
    const settings = page.getByRole('region', { name: 'Notifications', exact: true });
    await expect(settings.getByLabel('Message notifications')).toBeChecked();
    await expect(settings.getByLabel('Show sender and message previews')).not.toBeChecked();
    const saved = page.waitForResponse((response) => response.url().endsWith('/me/notifications') && response.request().method() === 'PUT');
    await settings.getByLabel('Show sender and message previews').check();
    expect((await saved).status()).toBe(204);
    await expect(settings.getByLabel('Show sender and message previews')).toBeEnabled();
    await settings.getByLabel('Conversation').selectOption(chatId);
    await settings.getByLabel('Duration').selectOption('8h');
    const muted = page.waitForResponse((response) => response.url().endsWith(`/chats/${chatId}/notification-mute`));
    await settings.getByRole('button', { name: 'Apply', exact: true }).click();
    expect((await muted).status()).toBe(204);
    await expect(settings.getByRole('button', { name: 'Unmute', exact: true })).toBeVisible();
    await page.reload();
    await openProfile(page);
    await page.getByRole('button', { name: /Notifications/ }).click();
    await expect(settings.getByLabel('Show sender and message previews')).toBeChecked();
    await expect(settings.getByRole('button', { name: 'Unmute', exact: true })).toBeVisible();
  } finally { await context.close(); }
});
