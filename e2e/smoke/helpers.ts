import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const MESSENGER_HEADING = 'Chats';
const PROFILE_BUTTON_NAME = 'Open profile';
const PROFILE_HEADING = 'Profile';
const LOGIN_BUTTON_NAME = 'Sign In';

export interface SmokeUser {
  username: string;
  displayName: string;
  password: string;
}

const uniquePart = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const chatListItemSelector = (chatName: string) => `[data-testid="chat-list-item"][data-chat-name="${chatName}"]`;
const searchResultSelector = (username: string) => `[data-testid="user-search-result"][data-username="${username}"]`;

export const createSmokeUser = (label: string): SmokeUser => {
  const suffix = uniquePart().slice(0, 12);
  const username = `smoke_${label}_${suffix}`.slice(0, 32);

  return {
    username,
    displayName: `Smoke ${label} ${suffix}`.slice(0, 50),
    password: `SmokePass!${suffix}`,
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
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
};

export const registerUser = async (page: Page, user: SmokeUser) => {
  await page.goto('/register');

  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Display Name').fill(user.displayName);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();

  await waitForMessenger(page);
};

export const loginUser = async (page: Page, user: SmokeUser) => {
  await page.goto('/login');
  await waitForLoginPage(page);

  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: LOGIN_BUTTON_NAME }).click();

  await waitForMessenger(page);
};

export const openProfile = async (page: Page) => {
  await page.getByRole('button', { name: PROFILE_BUTTON_NAME }).click();
  await expect(page.getByRole('heading', { name: PROFILE_HEADING })).toBeVisible();
};

export const closeProfile = async (page: Page) => {
  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.getByRole('heading', { name: PROFILE_HEADING })).not.toBeVisible();
};

export const logoutUser = async (page: Page) => {
  await openProfile(page);
  await page.getByRole('button', { name: 'Logout' }).click();
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
  const hasRequestInbox = await requestInboxButton.isVisible({ timeout: 5_000 }).catch(() => false);

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
