import { expect, test } from '@playwright/test';
import { messageByText, openDirectChat, openMessageMenu, sendMessage, uniqueText } from './helpers';

test('reads, reacts to, edits and deletes messages between two users', async ({ browser }) => {
  const first = uniqueText('First message');
  const chat = await openDirectChat(browser, 'msg', first);
  const { pageA, pageB } = chat;

  try {
    // B has the chat open, so A's message is read.
    await expect(messageByText(pageA, first).locator('svg.lucide-check-check')).toBeVisible();

    // B reacts; A sees the reaction.
    await openMessageMenu(pageB, first);
    await pageB.getByRole('button', { name: '👍' }).click();
    await expect(messageByText(pageA, first).locator('[data-testid="reaction-strip"] [data-reaction="👍"]')).toBeVisible();

    // A edits; B sees the new text, marked as edited.
    const edited = uniqueText('Edited message');
    await openMessageMenu(pageA, first);
    await pageA.getByRole('button', { name: 'Edit', exact: true }).click();
    const input = pageA.getByTestId('message-input-field');
    await input.fill(edited);
    await input.press('Enter');
    await expect(messageByText(pageB, edited)).toBeVisible();
    await expect(messageByText(pageB, edited)).toContainText('edited');

    // A deletes a message for everyone; it leaves B's chat.
    const doomed = uniqueText('Doomed message');
    await sendMessage(pageA, doomed);
    await expect(messageByText(pageB, doomed)).toBeVisible();
    await openMessageMenu(pageA, doomed);
    await pageA.getByRole('button', { name: 'Delete', exact: true }).click();
    await pageA.getByRole('button', { name: /Delete for everyone/ }).click();
    await expect(pageB.locator('[data-message-id]').filter({ hasText: doomed })).toHaveCount(0);
    await expect(pageA.locator('[data-message-id]').filter({ hasText: doomed })).toHaveCount(0);
  } finally {
    await chat.close();
  }
});
