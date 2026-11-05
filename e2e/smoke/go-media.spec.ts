import { expect, test } from '@playwright/test';
import { createEnglishContext, loginUser } from './helpers';

test('byte-based voice waveforms stay inside the message bubble', async ({ browser }, testInfo) => {
  test.skip(process.env.GO_API_TESTS !== '1' || !process.env.GO_TEST_USER_A || !process.env.GO_TEST_PASSWORD_A ||
    !process.env.GO_TEST_USER_B, 'Uses existing synthetic Go staging fixtures');
  const context = await createEnglishContext(browser);
  const page = await context.newPage();
  const peer = process.env.GO_TEST_USER_B!;
  try {
    await loginUser(page, { username: process.env.GO_TEST_USER_A!, password: process.env.GO_TEST_PASSWORD_A!, displayName: 'Go fixture' });
    const messageId = await page.evaluate(async ({ peer, api }) => {
      const base = api || `${location.origin}/api/v2`;
      const request = async (path: string, body: unknown) => {
        const response = await fetch(`${base}${path}`, {
          method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
          body: body instanceof FormData ? body : JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(result)}`);
        return result;
      };
      const chat = await request('/chats/create', { user2: peer });
      const rate = 8000;
      const samples = rate * 2;
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      const text = (offset: number, value: string) => [...value].forEach((letter, i) => view.setUint8(offset + i, letter.charCodeAt(0)));
      text(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples * 2, true);
      for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, Math.sin(i * Math.PI * 2 * 220 / rate) * 10000, true);
      const upload = new FormData();
      upload.set('file', new File([buffer], 'waveform-regression.wav', { type: 'audio/wav' }));
      upload.set('purpose', 'message'); upload.set('kind', 'voice'); upload.set('duration_ms', '2000');
      upload.set('waveform', JSON.stringify(Array.from({ length: 100 }, (_, i) => Math.round(30 + Math.abs(Math.sin(i / 7)) * 225))));
      const attachment = await request('/attachments', upload);
      const message = await request(`/chats/${chat.chat_id}/messages`, {
        client_temp_id: crypto.randomUUID(), type: 'voice', attachment_id: attachment.id,
      });
      return message.id as string;
    }, { peer, api: process.env.E2E_API_URL });
    await page.goto(`/dm/@${peer}`);
    const player = page.locator(`[data-message-id="${messageId}"] .voice-message-player`);
    await expect(player).toBeVisible();
    await expect(player.getByTestId('waveform-bar')).toHaveCount(38);
    const contained = await player.evaluate(element => {
      const player = element.getBoundingClientRect();
      return Array.from(element.querySelectorAll('[data-testid="waveform-bar"]')).every(bar => {
        const rect = bar.getBoundingClientRect();
        return rect.height <= 28 && rect.top >= player.top && rect.bottom <= player.bottom;
      });
    });
    expect(contained).toBe(true);
    await player.screenshot({ path: testInfo.outputPath('voice-waveform.png') });
  } finally {
    await context.close();
  }
});
