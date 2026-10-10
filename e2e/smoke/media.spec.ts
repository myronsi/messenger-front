import { expect, test } from '@playwright/test';
import { openDirectChat, uniqueText } from './helpers';

// An 8x8 PNG, so the server stores an image with a thumbnail.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM4oaGBFTEMLQkAgl1GAWqNFmsAAAAASUVORK5CYII=',
  'base64',
);

test('sends a photo and a voice message', async ({ browser }) => {
  const chat = await openDirectChat(browser, 'media', uniqueText('Media chat'));
  const { pageA, pageB } = chat;

  try {
    const photoName = `photo-${Date.now().toString(36)}.png`;
    await pageA.getByTestId('message-file-input').setInputFiles({ name: photoName, mimeType: 'image/png', buffer: PNG });
    await pageA.getByTestId('message-input-field').press('Enter');
    await expect(pageB.locator(`[data-message-id] img[alt="${photoName}"]`)).toBeVisible();

    const voiceMessages = pageB.getByRole('slider', { name: 'Seek voice message' }).or(pageB.getByLabel('Seek voice message'));
    const before = await voiceMessages.count();
    await pageA.getByRole('button', { name: 'Record voice message' }).click();
    await expect(pageA.getByRole('button', { name: 'Stop recording and send' })).toBeVisible();
    await pageA.waitForTimeout(1_500);
    await pageA.getByRole('button', { name: 'Stop recording and send' }).click();
    await expect(voiceMessages).toHaveCount(before + 1);
  } finally {
    await chat.close();
  }
});
