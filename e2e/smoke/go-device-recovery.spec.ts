import { expect, test } from '@playwright/test';
import { confirmRecoveryReceipt, createEnglishContext, createSmokeUser, openProfile, openSecuritySetting, registerUser, waitForMessenger } from './helpers';

test('a signed-in device approves the matching number and is revoked after recovery', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go backend');
  const trustedContext = await createEnglishContext(browser);
  const recoveryContext = await createEnglishContext(browser);
  const trusted = await trustedContext.newPage();
  const recovery = await recoveryContext.newPage();
  const sockets: string[] = [];
  trusted.on('websocket', socket => { if (new URL(socket.url()).pathname.endsWith('/api/v2/ws')) sockets.push(socket.url()); });
  const user = createSmokeUser('device');
  try {
    await registerUser(trusted, user);
    await expect.poll(() => sockets.length).toBe(1);
    await recovery.goto('/recover-device');
    await recovery.getByLabel('Username', { exact: true }).fill(user.username);
    const started = recovery.waitForResponse(response => response.url().endsWith('/auth/recovery-requests') && response.request().method() === 'POST');
    await recovery.getByRole('button', { name: 'Request approval', exact: true }).click();
    expect((await started).status()).toBe(200);
    const number = (await recovery.getByRole('img', { name: /^Your number is \d+/ }).getAttribute('aria-label'))!.match(/\d+/)![0];
    await trusted.bringToFront();
    const approval = trusted.getByRole('dialog', { name: 'Is someone trying to get into your account?' });
    await expect(approval).toBeVisible();
    await approval.getByRole('button', { name: `Choose ${number}`, exact: true }).click();
    await approval.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(approval).not.toBeVisible();
    await recovery.bringToFront();
    await expect(recovery.getByText('Approved. Choose a new password.', { exact: true })).toBeVisible();
    await recovery.getByLabel('New password', { exact: true }).fill(`${user.password}New`);
    await recovery.getByLabel('Confirm new password', { exact: true }).fill(`${user.password}New`);
    await recovery.getByRole('button', { name: 'Reset password', exact: true }).click();
    await expect(trusted).toHaveURL(/\/login$/);
    await confirmRecoveryReceipt(recovery);
    await recovery.getByRole('button', { name: 'I saved it, continue', exact: true }).click();
    await waitForMessenger(recovery);
    expect(sockets).toHaveLength(1);
  } finally { await trustedContext.close(); await recoveryContext.close(); }
});

test('an account with a passkey approves recovery with user verification instead of the password', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go backend with localhost passkeys configured');
  const trustedContext = await createEnglishContext(browser);
  const recoveryContext = await createEnglishContext(browser);
  await trustedContext.addInitScript(() => {
    Object.defineProperty(PublicKeyCredential, 'isConditionalMediationAvailable', { value: async () => false });
  });
  const trusted = await trustedContext.newPage();
  const recovery = await recoveryContext.newPage();
  const cdp = await trustedContext.newCDPSession(trusted);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: {
    protocol: 'ctap2', transport: 'internal', hasResidentKey: true,
    hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
  } });
  const user = createSmokeUser('devicekey');
  try {
    await registerUser(trusted, user);
    await openProfile(trusted);
    await openSecuritySetting(trusted, 'Sign-in', 'Passkeys');
    const settings = trusted.getByRole('region', { name: 'Passkeys', exact: true });
    await settings.getByLabel('Passkey name').fill('Phone');
    await settings.getByLabel('Current password').fill(user.password);
    await settings.getByRole('button', { name: 'Add passkey', exact: true }).click();
    await expect(settings.getByText('Phone', { exact: true })).toBeVisible();
    await trusted.getByRole('button', { name: 'Close', exact: true }).first().click();
    await recovery.goto('/recover-device');
    await recovery.getByLabel('Username', { exact: true }).fill(user.username);
    await recovery.getByRole('button', { name: 'Request approval', exact: true }).click();
    const number = (await recovery.getByRole('img', { name: /^Your number is \d+/ }).getAttribute('aria-label'))!.match(/\d+/)![0];
    await trusted.bringToFront();
    const approval = trusted.getByRole('dialog', { name: 'Is someone trying to get into your account?' });
    await expect(approval).toBeVisible();
    await expect(approval.getByLabel(/password/i)).toHaveCount(0);
    await approval.getByRole('button', { name: `Choose ${number}`, exact: true }).click();
    await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false });
    await approval.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(approval.getByRole('alert')).toBeVisible();
    await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: true });
    const options = trusted.waitForResponse(response => response.url().endsWith('/approve/options'));
    const approved = trusted.waitForResponse(response => response.url().endsWith('/approve') && response.request().method() === 'POST');
    await approval.getByRole('button', { name: 'Approve', exact: true }).click();
    expect(await (await options).json()).toMatchObject({ method: 'passkey' });
    expect((await approved).status()).toBe(200);
    await expect(approval).not.toBeVisible();
    await recovery.bringToFront();
    await expect(recovery.getByText('Approved. Choose a new password.', { exact: true })).toBeVisible();
  } finally { await trustedContext.close(); await recoveryContext.close(); }
});
