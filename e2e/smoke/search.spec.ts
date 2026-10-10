import { expect, test } from '@playwright/test';
import { apiAs, messageByText, openDirectChat } from './helpers';

const FILLER_MESSAGES = 52;

test('finds a message in the sidebar search and jumps to it in older history', async ({ browser }) => {
  test.setTimeout(180_000);
  const token = `needle${Date.now().toString(36)}`;
  const target = `The ${token} is here`;
  const chat = await openDirectChat(browser, 'search', target);
  const { pageA, pageB, userA } = chat;

  try {
    // Enough newer messages that the target is not on the first page of the chat.
    const chats = await apiAs(pageB, 'GET', '/chats');
    const chatId = chats.items.find((item: { peer?: { username: string } }) => item.peer?.username === userA.username).id;
    for (let index = 0; index < FILLER_MESSAGES; index += 1) {
      await apiAs(pageB, 'POST', `/chats/${chatId}/messages`, { client_temp_id: crypto.randomUUID(), type: 'text', content: `filler ${index}` });
    }
    // The index follows the messages within a few seconds.
    await expect.poll(async () => (await apiAs(pageA, 'GET', `/search/messages?q=${token}`)).items.length, { timeout: 30_000 }).toBeGreaterThan(0);

    await pageA.reload();
    await pageA.getByRole('button', { name: 'Open search' }).click();
    await pageA.getByPlaceholder('Search people and messages').fill(token);
    const result = pageA.getByTestId('message-search-result').first();
    await expect(result).toBeVisible();
    await expect(result.locator('mark')).toHaveText(token);
    await result.click();

    await expect(messageByText(pageA, target)).toBeInViewport();
  } finally {
    await chat.close();
  }
});
