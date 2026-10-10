import { expect, test } from '@playwright/test';
import { messageByText, openDirectChat, reloadMessenger, uniqueText, waitForMessenger } from './helpers';

// An access token that expired an hour ago (the signature does not matter: the app refreshes before using it).
const expiredToken = () => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '1', exp: Math.floor(Date.now() / 1000) - 3600 })}.expired`;
};

test('refreshes an expired access token and catches up after the network drops', async ({ browser }) => {
  test.setTimeout(120_000);
  const chat = await openDirectChat(browser, 'sess', uniqueText('Session chat'));
  const { pageA, pageB, userB } = chat;

  try {
    // The refresh cookie renews the session.
    const stale = expiredToken();
    await pageA.evaluate((token) => window.localStorage.setItem('access_token', token), stale);
    await reloadMessenger(pageA);
    await waitForMessenger(pageA);
    await expect.poll(() => pageA.evaluate(() => window.localStorage.getItem('access_token'))).not.toBe(stale);

    // B loses the network while A writes; after it comes back the message arrives.
    await pageA.getByTestId('chat-list-item').filter({ hasText: userB.displayName }).first().click();
    await pageB.context().setOffline(true);
    const missed = uniqueText('Sent while offline');
    const input = pageA.getByTestId('message-input-field');
    await input.fill(missed);
    await input.press('Enter');
    await expect(messageByText(pageA, missed)).toBeVisible();
    await pageB.waitForTimeout(2_000);
    await expect(pageB.locator('[data-message-id]').filter({ hasText: missed })).toHaveCount(0);

    await pageB.context().setOffline(false);
    await expect(messageByText(pageB, missed)).toBeVisible({ timeout: 30_000 });
  } finally {
    await chat.close();
  }
});
