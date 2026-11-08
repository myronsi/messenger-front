import { expect, test } from '@playwright/test';
import { createSmokeUser, loginUser, logoutUser, openProfile, registerUser, settingsSurface } from './helpers';

test('registers a user and logs back in', async ({ browser }) => {
  const user = createSmokeUser('auth');
  const context = await browser.newContext();

  await context.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
  });

  const page = await context.newPage();

  try {
    await registerUser(page, user);
    await logoutUser(page);
    await loginUser(page, user);
    await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
    await expect(settingsSurface(page)).not.toBeVisible();
    await openProfile(page);
  } finally {
    await context.close();
  }
});
