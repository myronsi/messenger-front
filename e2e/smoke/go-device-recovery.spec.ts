import { expect, test } from '@playwright/test';
import { confirmRecoveryReceipt, createEnglishContext, createSmokeUser, registerUser, waitForMessenger } from './helpers';

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
    const number = await recovery.getByLabel(/^Match number \d+$/).innerText();
    await trusted.bringToFront();
    const approval = trusted.getByRole('dialog', { name: 'Approve account recovery?' });
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
    await recovery.getByRole('button', { name: 'Continue', exact: true }).click();
    await waitForMessenger(recovery);
    expect(sockets).toHaveLength(1);
  } finally { await trustedContext.close(); await recoveryContext.close(); }
});
