import { expect, test } from '@playwright/test';
import { closeProfile, createEnglishContext, createSmokeUser, logoutUser, openProfile, registerUser, waitForChatListItem } from './helpers';

test('notification preferences persist and conversations can be muted', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go notification API');
  const context = await createEnglishContext(browser);
  const page = await context.newPage();
  const user = createSmokeUser('notify');
  const chatName = 'Notification smoke chat';
  try {
    await registerUser(page, user);
    const base = process.env.E2E_API_URL!;
    const chatId = await page.evaluate(async ({ api, name }) => {
      const response = await fetch(`${api}/groups`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, member_ids: [] }),
      });
      if (!response.ok) throw new Error(`Create group: ${response.status}`);
      return (await response.json()).id as string;
    }, { api: base, name: chatName });
    await openProfile(page);
    await page.getByRole('button', { name: /Notifications/ }).click();
    const settings = page.getByRole('region', { name: 'Notifications', exact: true });
    await expect(settings.getByLabel('Message notifications')).toBeChecked();
    await expect(settings.getByLabel('Show sender and message previews')).not.toBeChecked();
    const saved = page.waitForResponse((response) => response.url().endsWith('/me/notifications') && response.request().method() === 'PUT');
    await settings.getByLabel('Show sender and message previews').click();
    expect((await saved).status()).toBe(204);
    await expect(settings.getByLabel('Show sender and message previews')).toBeChecked();
    await expect(settings.getByLabel('Show sender and message previews')).toBeEnabled();
    await closeProfile(page);
    await waitForChatListItem(page, chatName);
    const chatItem = page.locator(`[data-testid="chat-list-item"][data-chat-name="${chatName}"]`).first();
    await chatItem.click({ button: 'right' });
    await page.getByRole('menu').getByRole('button', { name: 'Mute', exact: true }).click();
    const muted = page.waitForResponse((response) => response.url().endsWith(`/chats/${chatId}/notification-mute`));
    await page.getByRole('menu').getByRole('button', { name: 'For 8 hours', exact: true }).click();
    expect((await muted).status()).toBe(204);
    await expect(chatItem.getByTestId('chat-muted-icon')).toBeVisible();
    await logoutUser(page);
    await page.goto(`/chat/${chatId}?notification=1`);
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/chat/${chatId}$`));
    await page.reload();
    await expect(chatItem.getByTestId('chat-muted-icon')).toBeVisible();
    await chatItem.click({ button: 'right' });
    await expect(page.getByRole('menu').getByRole('button', { name: /^Unmute/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await openProfile(page);
    await page.getByRole('button', { name: /Notifications/ }).click();
    await expect(settings.getByLabel('Show sender and message previews')).toBeChecked();
  } finally { await context.close(); }
});
