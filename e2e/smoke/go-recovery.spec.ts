import { expect, test } from '@playwright/test';
import { createEnglishContext, createSmokeUser, logoutUser, waitForMessenger } from './helpers';

test('Go recovery saves a single-use key, resets the password and shows its replacement', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires Go staging');
  const context = await createEnglishContext(browser);
  const page = await context.newPage();
  const user = createSmokeUser('recovery');
  try {
    await page.goto('/register');
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Display Name').fill(user.displayName);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    const key = await page.getByTestId('recovery-key').innerText();
    expect(key).toMatch(/^(?:[A-Z2-7]{4}-){7}[A-Z2-7]{4}$/);
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
    await page.getByLabel('I saved my recovery key').check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
    await waitForMessenger(page);
    const oldToken = await page.evaluate(() => localStorage.getItem('access_token'));
    await logoutUser(page);
    await page.goto('/recover-username');
    await page.getByLabel('Username', { exact: true }).fill(user.username);
    await page.getByLabel('Recovery key', { exact: true }).fill(key);
    await page.getByLabel('New password', { exact: true }).fill(`${user.password}New`);
    await page.getByLabel('Confirm new password', { exact: true }).fill(`${user.password}New`);
    const resetResponse = page.waitForResponse(r => r.url().endsWith('/auth/recover/key'));
    await page.getByRole('button', { name: 'Reset password', exact: true }).click();
    const response = await resetResponse;
    expect(response.status()).toBe(200);
    const replacement = await page.getByTestId('recovery-key').innerText();
    expect(replacement).not.toBe(key);
    await page.getByLabel('I saved my recovery key').check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await waitForMessenger(page);
    const checks = await page.evaluate(async ({ oldToken, username, key, password }) => {
      const headers = { 'Content-Type': 'application/json', 'X-Client-Version': 'recovery-e2e', 'X-Client-Api-Version': '2.0.0-alpha.1' };
      const base = `${location.origin}/api/v2`;
      const old = await fetch(`${base}/me`, { headers: { ...headers, Authorization: `Bearer ${oldToken}` } });
      const replay = await fetch(`${base}/auth/recover/key`, { method: 'POST', headers, body: JSON.stringify({ username, recovery_key: key, new_password: password }) });
      const oldPassword = await fetch(`${base}/auth/login`, { method: 'POST', headers, body: JSON.stringify({ username, password }) });
      return { old: old.status, replay: replay.status, oldPassword: oldPassword.status };
    }, { oldToken, username: user.username, key, password: user.password });
    expect(checks).toEqual({ old: 401, replay: 400, oldPassword: 401 });
    await page.getByRole('button', { name: 'Open profile', exact: true }).click();
    await page.getByRole('button', { name: /Security & devices/ }).click();
    await expect(page.getByText(/Security changes are locked until/)).toBeVisible();
  } finally { await context.close(); }
});
