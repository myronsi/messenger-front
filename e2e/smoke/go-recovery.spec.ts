import { expect, test } from '@playwright/test';
import { createEnglishContext, createSmokeUser, loginUser, logoutUser, waitForMessenger } from './helpers';

test('an existing Go user can enroll a recovery key after signing in', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1' || !process.env.GO_LEGACY_USERNAME || !process.env.GO_LEGACY_PASSWORD, 'Requires a synthetic account without a recovery key');
  const context = await createEnglishContext(browser);
  const page = await context.newPage();
  try {
    await page.goto('/login');
    await page.getByLabel('Username').fill(process.env.GO_LEGACY_USERNAME!);
    await page.getByLabel('Password', { exact: true }).fill(process.env.GO_LEGACY_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Protect access to your account' })).toBeVisible();
    await dialog.getByLabel('Current password').fill(process.env.GO_LEGACY_PASSWORD!);
    await dialog.getByRole('button', { name: 'Create recovery key', exact: true }).click();
    await expect(dialog.getByTestId('recovery-key')).toBeVisible();
    await dialog.getByLabel('I saved my recovery key').check();
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(dialog.getByText('A recovery key is set up.', { exact: false })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForMessenger(page);
    await page.reload();
    await waitForMessenger(page);
    await expect(page.getByRole('heading', { name: 'Protect access to your account' })).not.toBeVisible();
  } finally { await context.close(); }
});

test('Go recovery saves a single-use key, resets the password and shows its replacement', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires Go staging');
  const context = await createEnglishContext(browser);
  const otherContext = await createEnglishContext(browser);
  const page = await context.newPage();
  const otherPage = await otherContext.newPage();
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
    await loginUser(otherPage, user);
    const oldToken = await otherPage.evaluate(() => localStorage.getItem('access_token'));
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
    await expect(otherPage).toHaveURL(/\/login$/);
    await expect(otherPage.getByText('Your password was reset using account recovery. Please sign in again.', { exact: true })).toBeVisible();
    const replacement = await page.getByTestId('recovery-key').innerText();
    expect(replacement).not.toBe(key);
    await page.getByLabel('I saved my recovery key').check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await waitForMessenger(page);
    const checks = await page.evaluate(async ({ oldToken, username, key, password, api }) => {
      const headers = { 'Content-Type': 'application/json', 'X-Client-Version': 'recovery-e2e', 'X-Client-Api-Version': '2.0.0-alpha.1' };
      const base = api || `${location.origin}/api/v2`;
      const old = await fetch(`${base}/me`, { headers: { ...headers, Authorization: `Bearer ${oldToken}` } });
      const replay = await fetch(`${base}/auth/recover/key`, { method: 'POST', headers, body: JSON.stringify({ username, recovery_key: key, new_password: password }) });
      const oldPassword = await fetch(`${base}/auth/login`, { method: 'POST', headers, body: JSON.stringify({ username, password }) });
      return { old: old.status, replay: replay.status, oldPassword: oldPassword.status };
    }, { oldToken, username: user.username, key, password: user.password, api: process.env.E2E_API_URL });
    expect(checks).toEqual({ old: 401, replay: 400, oldPassword: 401 });
    await page.getByRole('button', { name: 'Open profile', exact: true }).click();
    await page.getByRole('button', { name: /Security & devices/ }).click();
    await expect(page.getByText(/Security changes are locked until/)).toBeVisible();
  } finally { await context.close(); await otherContext.close(); }
});
