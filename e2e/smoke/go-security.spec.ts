import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createEnglishContext, loginUser, logoutUser } from './helpers';

const totp = (secret: string) => {
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const character of secret.toUpperCase().replace(/=+$/, '')) {
    value = (value << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(character);
    bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  return String((digest.readUInt32BE(digest[digest.length - 1] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
};
const nextStep = () => new Promise(resolve => setTimeout(resolve, 30500 - Date.now() % 30000));

test('Go two-factor setup, backup-code login and disable work through the UI', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1' || !process.env.GO_SECURITY_FIXTURE, 'Requires a dedicated synthetic security fixture');
  test.setTimeout(120000);
  const fixture: {username: string; password: string} = JSON.parse(await readFile(process.env.GO_SECURITY_FIXTURE!, 'utf8'));
  const context = await createEnglishContext(browser);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  try {
    await loginUser(page, { ...fixture, displayName: 'Security fixture' });
    await page.getByRole('button', { name: 'Open profile', exact: true }).click();
    await page.getByRole('button', { name: /Security & devices/ }).click();
    await page.getByLabel('Password for two-factor setup').fill(fixture.password);
    const section = page.locator('section').filter({ hasText: 'Two-factor authentication' });
    const setupResponse = page.waitForResponse(response => response.url().endsWith('/me/2fa/setup'));
    await section.getByRole('button', { name: 'Enable', exact: true }).click();
    const setup = await (await setupResponse).json();
    expect(typeof setup.secret).toBe('string');
    await writeFile(process.env.GO_SECURITY_FIXTURE!, JSON.stringify({ ...fixture, totp_secret: setup.secret }));
    await nextStep(); // A setup performed earlier by the API audit may have used this time step.
    await section.getByPlaceholder('Verification code', { exact: true }).fill(totp(setup.secret));
    const confirmation = page.waitForResponse(response => response.url().endsWith('/me/2fa/confirm'));
    await section.getByRole('button', { name: 'Enable', exact: true }).click();
    const result = await (await confirmation).json();
    expect(result.recovery_codes.length).toBeGreaterThan(0);
    await expect(section.getByRole('button', { name: 'Disable', exact: true })).toBeVisible();
    await page.goto('/');
    await logoutUser(page);
    await page.getByLabel('Username', { exact: true }).fill(fixture.username);
    await page.getByLabel('Password', { exact: true }).fill(fixture.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.getByLabel('Verification code', { exact: true }).fill(result.recovery_codes[0]);
    await page.getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Chats', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Open profile', exact: true }).click();
    await page.getByRole('button', { name: /Security & devices/ }).click();
    await expect(section.getByRole('button', { name: 'Disable', exact: true })).toBeVisible();
    await nextStep();
    await section.getByPlaceholder('Password', { exact: true }).fill(fixture.password);
    await section.getByPlaceholder('Verification code', { exact: true }).fill(totp(setup.secret));
    await section.getByRole('button', { name: 'Disable', exact: true }).click();
    await expect(page.getByLabel('Password for two-factor setup')).toBeVisible();
  } finally {
    await context.close();
  }
});
