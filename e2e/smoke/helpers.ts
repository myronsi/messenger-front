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

const uniquePart = () => `${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`;

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
  const context = await browser.newContext({ permissions: ['microphone'] });
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

  // A recovery step ("Continue") may come before the profile step, depending on the backend's features.
  const continueButton = page.getByRole('button', { name: 'Continue' });
  const skipButton = page.getByRole('button', { name: 'Skip for now' });
  await expect(continueButton.or(skipButton)).toBeVisible();
  if (await continueButton.isVisible()) await continueButton.click();
  await skipButton.click();

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
  await page.getByPlaceholder('Search people and messages').fill(targetUsername);
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

export const messageByText = (page: Page, text: string) => page.locator('[data-message-id]').filter({ hasText: text }).last();

export interface DirectChat {
  userA: SmokeUser;
  userB: SmokeUser;
  pageA: Page;
  pageB: Page;
  close: () => Promise<void>;
}

// Two new users with a direct chat open on both sides: A writes first, B approves the request if the
// backend asks for one, and both open the chat from their list.
export const openDirectChat = async (browser: Browser, label: string, firstMessage: string): Promise<DirectChat> => {
  const userA = createSmokeUser(`${label}a`);
  const userB = createSmokeUser(`${label}b`);
  const contextA = await createEnglishContext(browser);
  const contextB = await createEnglishContext(browser);
  const close = async () => { await Promise.all([contextA.close(), contextB.close()]); };
  try {
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    await registerUser(pageA, userA);
    await registerUser(pageB, userB);
    await openPreviewChat(pageA, userB.username);
    await sendMessage(pageA, firstMessage);
    await approvePendingRequestIfPresent(pageB, userA.username);
    await reloadMessenger(pageA);
    await reloadMessenger(pageB);
    await openChatFromList(pageA, userB.username);
    await openChatFromList(pageB, userA.username);
    await expect(messageByText(pageB, firstMessage)).toBeVisible();
    return { userA, userB, pageA, pageB, close };
  } catch (error) {
    await close();
    throw error;
  }
};

// Right-click opens the context menu and the reaction bar of a message.
export const openMessageMenu = async (page: Page, text: string) => {
  await messageByText(page, text).click({ button: 'right' });
};

export const uniqueText = (label: string) => `${label} ${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`;

const API_URL = (process.env.E2E_API_URL ?? process.env.VITE_API_URL ?? 'http://127.0.0.1:8080/api/v2').replace(/\/+$/, '');

// Calls the API as the user signed in on the page (its access token), for setup the UI would make slow.
// 429 answers are retried after the time the server asks for.
export const apiAs = async (page: Page, method: string, path: string, body?: unknown) => {
  const token = await page.evaluate(() => window.localStorage.getItem('access_token'));
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await page.request.fetch(`${API_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      ...(body === undefined ? {} : { data: body }),
    });
    if (response.status() !== 429) {
      expect(response.ok(), `${method} ${path} answered ${response.status()}`).toBe(true);
      return response.status() === 204 ? null : response.json();
    }
    const retryAfter = Number(response.headers()['retry-after'] ?? '1');
    await page.waitForTimeout(Math.max(1, retryAfter) * 1_000);
  }
  throw new Error(`${method} ${path} stayed rate limited`);
};
