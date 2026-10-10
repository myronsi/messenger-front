import { expect, test } from '@playwright/test';
import {
  closeProfile, createEnglishContext, createSmokeUser, messageByText, openChatFromList, openProfile, registerUser, sendMessage, uniqueText,
  waitForChatListItem,
} from './helpers';

test('creates a group, talks in it, adds and removes a member', async ({ browser }) => {
  test.setTimeout(120_000);
  const owner = createSmokeUser('gowner');
  const member = createSmokeUser('gmember');
  const guest = createSmokeUser('gguest');
  const contexts = await Promise.all([createEnglishContext(browser), createEnglishContext(browser), createEnglishContext(browser)]);
  const [pageOwner, pageMember, pageGuest] = await Promise.all(contexts.map((context) => context.newPage()));
  const groupName = `Smoke group ${Date.now().toString(36)}`;

  try {
    await registerUser(pageOwner, owner);
    await registerUser(pageMember, member);
    await registerUser(pageGuest, guest);

    // Create the group with one member.
    await openProfile(pageOwner);
    await pageOwner.getByRole('button', { name: 'Create Group' }).click();
    await pageOwner.getByPlaceholder('Group Name').fill(groupName);
    await pageOwner.getByRole('button', { name: 'Next' }).click();
    await pageOwner.getByPlaceholder('Search users...').fill(member.username);
    await pageOwner.getByRole('button', { name: new RegExp(`@${member.username}`) }).click();
    await pageOwner.getByRole('button', { name: 'Create', exact: true }).click();
    await pageOwner.getByRole('button', { name: 'OK' }).click();
    await closeProfile(pageOwner);

    await openChatFromList(pageOwner, groupName);
    await waitForChatListItem(pageMember, groupName);
    await openChatFromList(pageMember, groupName);

    const hello = uniqueText('Hello group');
    await sendMessage(pageOwner, hello);
    await expect(messageByText(pageMember, hello)).toBeVisible();

    // Add a third user from the group profile, then remove them again.
    await pageOwner.getByRole('button', { name: new RegExp(groupName) }).first().click();
    await pageOwner.getByRole('button', { name: 'Participants', exact: true }).click();
    const usernameInput = pageOwner.getByPlaceholder('Enter username');
    await usernameInput.fill(guest.username);
    await usernameInput.press('Enter');
    const guestRow = pageOwner.locator('div').filter({ hasText: `@${guest.username}` }).filter({ has: pageOwner.getByRole('button', { name: 'Actions' }) }).last();
    await expect(guestRow).toBeVisible();

    await guestRow.getByRole('button', { name: 'Actions' }).click();
    await pageOwner.getByRole('menuitem', { name: 'Remove participant' }).click();
    await pageOwner.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(pageOwner.getByText(`@${guest.username}`)).toHaveCount(0);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
