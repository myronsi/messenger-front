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

test('links the help site instead of an in-app help page', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.localStorage.setItem('language', 'de');
  });
  const page = await context.newPage();

  try {
    await page.goto('/register');
    const footer = page.getByRole('navigation', { name: 'Hilfe und rechtliche Hinweise' });
    await expect(footer.getByRole('link', { name: 'Hilfe' })).toHaveAttribute('href', /^https:\/\/docs\.(staging\.)?messenger\.viserix\.com\/$/);
    await expect(footer.getByRole('link', { name: 'Datenschutzerklärung' })).toHaveAttribute('href', /#\/privacy\/de$/);
    await expect(page.getByRole('button', { name: 'Konto erstellen', exact: true })).toBeDisabled();
  } finally {
    await context.close();
  }
});
