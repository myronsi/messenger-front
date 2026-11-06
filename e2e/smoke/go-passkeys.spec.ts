import { expect, test } from '@playwright/test';
import { createEnglishContext, createSmokeUser, logoutUser, openProfile, openSecuritySetting, registerUser, waitForMessenger } from './helpers';

test('a verified resident passkey registers, signs in and can be removed with the password', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go backend with localhost passkeys configured');
  const context = await createEnglishContext(browser);
  // Exercise the explicit button deterministically; a virtual authenticator
  // otherwise immediately satisfies the separate conditional-autofill request.
  await context.addInitScript(() => {
    Object.defineProperty(PublicKeyCredential, 'isConditionalMediationAvailable', { value: async () => false });
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: {
    protocol: 'ctap2', transport: 'internal', hasResidentKey: true,
    hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
  } });
  const user = createSmokeUser('passkey');
  try {
    await registerUser(page, user);
    await openProfile(page);
    await openSecuritySetting(page, 'Sign-in', 'Passkeys');
    const settings = page.getByRole('region', { name: 'Passkeys', exact: true });
    await settings.getByLabel('Passkey name').fill('Browser test key');
    await settings.getByLabel('Current password').fill(user.password);
    const registration = page.waitForResponse(response => response.url().endsWith('/auth/passkeys/register/verify'));
    await settings.getByRole('button', { name: 'Add passkey', exact: true }).click();
    expect((await registration).status()).toBe(204);
    await expect(settings.getByText('Browser test key', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).first().click();
    await logoutUser(page);
    const login = page.waitForResponse(response => response.url().endsWith('/auth/passkeys/login/verify'));
    await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click();
    expect((await login).status()).toBe(200);
    await waitForMessenger(page);
    await openProfile(page);
    await openSecuritySetting(page, 'Sign-in', 'Passkeys');
    await settings.getByRole('button', { name: 'Remove Browser test key', exact: true }).click();
    await expect(settings.getByRole('button', { name: 'Confirm removal' })).toBeDisabled();
    await settings.locator('#remove-passkey-password').fill(user.password);
    await settings.getByRole('button', { name: 'Confirm removal' }).click();
    await expect(settings.getByText('No passkeys yet.', { exact: true })).toBeVisible();
  } finally { await context.close(); }
});
