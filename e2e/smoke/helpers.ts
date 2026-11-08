import { expect, type Browser, type BrowserContext, type Page, type Locator } from '@playwright/test';

const MESSENGER_HEADING = 'Chats';
const PROFILE_BUTTON_NAME = /^Your profile and settings/;
const LOGIN_BUTTON_NAME = 'Sign in';

export interface SmokeUser {
  username: string;
  displayName: string;
  password: string;
}

const uniquePart = () => `${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`;

const chatListItemSelector = (chatName: string) => `[data-testid="chat-list-item"][data-chat-name="${chatName}"]`;
const searchResultSelector = (username: string) => `[data-testid="user-search-result"][data-username="${username}"]`;

export const createSmokeUser = (label: string): SmokeUser => {
  const suffix = uniquePart().slice(0, 12);
  const username = `smoke_${label}_${suffix}`.slice(0, 32);

  return {
    username,
    displayName: `Smoke ${label} ${suffix}`.slice(0, 50),
    password: `SmokePass1!${suffix}`,
  };
};

export const createEnglishContext = async (browser: Browser): Promise<BrowserContext> => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
  });
  return context;
};

export const waitForMessenger = async (page: Page) => {
  await expect(page.getByRole('heading', { name: MESSENGER_HEADING })).toBeVisible();
  await expect(page.getByRole('button', { name: PROFILE_BUTTON_NAME })).toBeVisible();
};

export const waitForLoginPage = async (page: Page) => {
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
};

export const confirmRecoveryReceipt = async (scope: Page | Locator) => {
  const page = 'page' in scope ? scope.page() : scope;
  const download = page.waitForEvent('download');
  await scope.getByRole('button', { name: /^(Download recovery key|Downloaded)$/ }).click();
  await download;
  await scope.getByRole('checkbox', { name: /I saved my recovery key somewhere safe/ }).check();
  await scope.getByRole('button', { name: 'Continue', exact: true }).click();
};

export const skipRegistrationExtras = async (page: Page) => {
  const profileSkip = page.getByRole('button', { name: 'Skip for now', exact: true });
  const passkeyNotNow = page.getByRole('button', { name: 'Not now', exact: true });
  await expect(profileSkip.or(passkeyNotNow).first()).toBeVisible();
  if (await passkeyNotNow.isVisible()) await passkeyNotNow.click();
  await profileSkip.click();
};

export const finishProfileStep = async (page: Page, user: SmokeUser) => {
  const displayName = page.getByLabel('Display name', { exact: true });
  const passkeyNotNow = page.getByRole('button', { name: 'Not now', exact: true });
  await expect(displayName.or(passkeyNotNow).first()).toBeVisible();
  if (await passkeyNotNow.isVisible()) await passkeyNotNow.click();
  await displayName.fill(user.displayName);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
};

export const registerUser = async (page: Page, user: SmokeUser) => {
  await page.goto('/register');

  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/auth/register') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  const response = await responsePromise;
  expect(response.ok(), `Registration returned HTTP ${response.status()}`).toBe(true);
  const savedKey = page.getByTestId('recovery-key');
  const nextStep = page.getByRole('button', { name: 'Not now', exact: true }).or(page.getByLabel('Display name', { exact: true }));
  await expect(savedKey.or(nextStep).first()).toBeVisible();
  if (await savedKey.isVisible()) await confirmRecoveryReceipt(page);
  await finishProfileStep(page, user);

  await waitForMessenger(page);
};

export const loginUser = async (page: Page, user: SmokeUser) => {
  await page.goto('/login');
  await waitForLoginPage(page);

  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: LOGIN_BUTTON_NAME, exact: true }).click();

  await waitForMessenger(page);
};

export const openProfile = async (page: Page) => {
  await page.getByRole('button', { name: PROFILE_BUTTON_NAME }).click();
  await expect(settingsSurface(page)).toBeVisible();
};

export const settingsSurface = (page: Page) => page.getByRole('dialog', { name: 'Profile', exact: true })
  .or(page.getByRole('region', { name: 'Settings', exact: true }));

export const closeProfile = async (page: Page) => {
  await page.getByRole('button', { name: /^(Close settings|Back to chats)$/ }).first().click();
  await expect(settingsSurface(page)).not.toBeVisible();
};

export const confirmTwoFactor = async (page: Page, code: string) => {
  const dialog = page.getByRole('dialog', { name: 'Confirm with two-factor authentication' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Authenticator or backup code').fill(code);
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(dialog).not.toBeVisible();
};

export const openSecuritySetting = async (page: Page, group: 'Sign-in' | 'Recovery' | 'Devices', setting: string) => {
  await page.getByRole('button', { name: /Security & devices/ }).click();
  await page.getByRole('region', { name: group, exact: true }).getByRole('button', { name: new RegExp(`^${setting}`) }).click();
  await expect(page.getByRole('navigation', { name: 'breadcrumb' }).getByText(setting, { exact: true })).toBeVisible();
};

export const logoutUser = async (page: Page) => {
  await openProfile(page);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await waitForLoginPage(page);
};

export const openPreviewChat = async (page: Page, targetUsername: string) => {
  await page.getByRole('button', { name: 'Open search' }).click();
  await page.getByPlaceholder('Search users...').fill(targetUsername);
  await expect(page.locator(searchResultSelector(targetUsername))).toBeVisible();
  await page.locator(searchResultSelector(targetUsername)).click();
  await expect(page.getByTestId('message-input-field')).toBeVisible();
};

export const waitForChatListItem = async (page: Page, chatName: string) => {
  await expect(page.locator(chatListItemSelector(chatName)).first()).toBeVisible();
};

export const openChatFromList = async (page: Page, chatName: string) => {
  await waitForChatListItem(page, chatName);
  await page.locator(chatListItemSelector(chatName)).first().click();
  await expect(page.getByTestId('message-input-field')).toBeVisible();
};

export const sendMessage = async (page: Page, text: string) => {
  const input = page.getByTestId('message-input-field');
  await input.fill(text);
  await input.press('Enter');
  await expect(page.locator('[data-message-id]').filter({ hasText: text }).last()).toBeVisible();
};

export const approvePendingRequestIfPresent = async (page: Page, requesterUsername: string) => {
  await openProfile(page);

  const requestInboxButton = page.getByRole('button', { name: /Request inbox/i });
  // The button appears only after the inbox query returns, so wait for it instead of checking once.
  const hasRequestInbox = await requestInboxButton.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);

  if (!hasRequestInbox) {
    await closeProfile(page);
    return false;
  }

  await requestInboxButton.click();

  const requestCard = page.locator('div').filter({
    has: page.getByText(`@${requesterUsername}`, { exact: true }),
  }).filter({
    hasText: 'Direct message request',
  }).first();

  await expect(requestCard).toBeVisible();
  await requestCard.getByRole('button', { name: 'Approve' }).click();
  await closeProfile(page);

  return true;
};

export const reloadMessenger = async (page: Page) => {
  await page.goto('/');
  await waitForMessenger(page);
};

export const uploadFile = async (
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) => {
  await page.getByTestId('message-file-input').setInputFiles(file);
  await page.getByTestId('message-input-field').press('Enter');
};
