import { expect, test } from '@playwright/test';
import { createEnglishContext, createSmokeUser, registerUser, waitForLoginPage, waitForMessenger } from './helpers';

test('a signed-in device approves a QR code and the other device is signed in', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go backend');
  const newContext = await createEnglishContext(browser);
  const trustedContext = await createEnglishContext(browser);
  const newDevice = await newContext.newPage();
  const trusted = await trustedContext.newPage();
  const user = createSmokeUser('qr');
  try {
    await registerUser(trusted, user);
    await newDevice.goto('/login');
    await waitForLoginPage(newDevice);
    const created = newDevice.waitForResponse(response => response.url().endsWith('/auth/qr-login') && response.request().method() === 'POST');
    await newDevice.getByRole('button', { name: 'Sign in with QR code', exact: true }).click();
    const createdResponse = await created;
    expect(createdResponse.status()).toBe(201);
    const { url, request_id: requestId } = await createdResponse.json() as { url: string; request_id: string };
    expect(requestId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await expect(newDevice.getByRole('img', { name: 'Sign-in QR code' })).toBeVisible();
    await expect(newDevice.getByText('Waiting for your phone…', { exact: true })).toBeVisible();

    await trusted.bringToFront();
    await trusted.goto(new URL(url, newDevice.url()).pathname);
    await expect(trusted.getByRole('heading', { name: 'Sign in on another device?' })).toBeVisible();
    await expect(trusted.getByText(/Never scan a code someone sent you/)).toBeVisible();
    await newDevice.bringToFront();
    await newDevice.waitForResponse(async response => response.url().endsWith(`/auth/qr-login/${requestId}/poll`)
      && response.status() === 200 && (await response.json() as { status: string }).status === 'scanned');
    await expect(newDevice.getByText('Scanned — confirm on your phone', { exact: true })).toBeVisible();

    await trusted.bringToFront();
    await trusted.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(trusted.getByText('Done — the other device is signed in', { exact: true })).toBeVisible();
    await trusted.getByRole('button', { name: 'Back to chats', exact: true }).click();
    await waitForMessenger(trusted);

    await newDevice.bringToFront();
    await waitForMessenger(newDevice);
    await trusted.goto(new URL(url, newDevice.url()).pathname);
    await expect(trusted.getByText('This code has expired', { exact: true })).toBeVisible();
  } finally { await newContext.close(); await trustedContext.close(); }
});
