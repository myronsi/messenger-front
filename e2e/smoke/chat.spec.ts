import { expect, test } from '@playwright/test';
import {
  approvePendingRequestIfPresent,
  createEnglishContext,
  createSmokeUser,
  openChatFromList,
  openPreviewChat,
  registerUser,
  reloadMessenger,
  sendMessage,
  uploadFile,
  waitForChatListItem,
} from './helpers';

test('creates a direct chat, delivers a realtime message, and uploads a file', async ({ browser }) => {
  const userA = createSmokeUser('sender');
  const userB = createSmokeUser('receiver');
  const contextA = await createEnglishContext(browser);
  const contextB = await createEnglishContext(browser);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const initialMessage = `Initial smoke message ${Date.now().toString(36)}`;
  const realtimeMessage = `Realtime smoke message ${Date.now().toString(36)}`;
  const fileName = `smoke-${Date.now().toString(36)}.txt`;

  try {
    await registerUser(pageA, userA);
    await registerUser(pageB, userB);

    await openPreviewChat(pageA, userB.username);
    await sendMessage(pageA, initialMessage);

    await approvePendingRequestIfPresent(pageB, userA.username);

    await reloadMessenger(pageA);
    await reloadMessenger(pageB);

    await waitForChatListItem(pageA, userB.username);
    await waitForChatListItem(pageB, userA.username);

    await openChatFromList(pageA, userB.username);
    await openChatFromList(pageB, userA.username);

    await expect(pageB.locator('[data-message-id]').filter({ hasText: initialMessage }).last()).toBeVisible();

    await sendMessage(pageA, realtimeMessage);
    await expect(pageB.locator('[data-message-id]').filter({ hasText: realtimeMessage }).last()).toBeVisible();

    await uploadFile(pageA, {
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(`smoke file ${fileName}`, 'utf8'),
    });

    await expect(pageB.locator('[data-message-id]').filter({ hasText: fileName }).last()).toBeVisible();
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
