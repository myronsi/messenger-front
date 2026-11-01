import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createEnglishContext, createSmokeUser, registerUser } from './helpers';

test('Go profile, avatar, privacy, sessions, groups and blocking remain usable', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the isolated Go staging backend');
  const user = createSmokeUser('settings');
  const peer = createSmokeUser('member');
  const context = await createEnglishContext(browser);
  const otherContext = await createEnglishContext(browser);
  const page = await context.newPage();
  const other = await otherContext.newPage();
  const image = (await readFile('public/pwa-64x64.png')).toString('base64');
  try {
    await registerUser(page, user);
    await registerUser(other, peer);
    const result = await page.evaluate(async ({ peer, image }) => {
      const base = `${location.origin}/api/v2`;
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const request = async (path: string, method = 'GET', body?: unknown) => {
        const response = await fetch(`${base}${path}`, { method, headers: { ...headers, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
        const result = await response.json();
        if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(result)}`);
        return result;
      };
      await request('/auth/me', 'PUT', { display_name: 'Updated smoke profile' });
      await request('/auth/me/bio', 'POST', { bio: 'Go migration test' });
      const form = new FormData();
      form.set('file', new File([Uint8Array.from(atob(image), c => c.charCodeAt(0))], 'avatar.png', { type: 'image/png' }));
      await request('/auth/me/avatar', 'POST', form);
      const me = await request('/auth/me');
      const avatars = await request(`/users/users/${me.username}/avatars`);
      const security = await request('/auth/me/security/session-duration', 'PUT', { session_duration_days: 30 });
      const sessions = await request('/auth/me/sessions');
      const privacy = await request('/auth/me/privacy', 'PUT', { avatar_visibility: 'shared_chats', read_receipts_enabled: true });
      const group = await request('/groups/create', 'POST', { name: 'Go migration group', description: 'Synthetic test group', participants: [peer] });
      const details = await request(`/groups/${group.chat_id}`);
      await request(`/groups/${group.chat_id}`, 'PATCH', { name: 'Updated Go group' });
      await request(`/auth/me/blocked-users/${peer}`, 'POST');
      const blocked = await request('/auth/me/blocked-users');
      await request(`/auth/me/blocked-users/${peer}`, 'DELETE');
      await request(`/groups/delete/${group.chat_id}`, 'DELETE');
      const blockedNames = blocked.users.map((item: {username: string}) => item.username);
      return { me, avatars, security, sessions, privacy, memberCount: details.participants.length, blocked: blockedNames };
    }, { peer: peer.username, image });
    expect(result.me.display_name).toBe('Updated smoke profile');
    expect(result.me.bio).toBe('Go migration test');
    expect(result.avatars.avatars.length).toBeGreaterThan(0);
    expect(result.security.session_duration_days).toBe(30);
    expect(result.sessions.sessions.some((session: {is_current: boolean}) => session.is_current)).toBe(true);
    expect(result.privacy.avatar_visibility).toBe('shared_chats');
    expect(result.memberCount).toBe(2);
    expect(result.blocked).toContain(peer.username);
    await page.reload();
    await page.getByRole('button', { name: 'Open profile', exact: true }).click();
    await expect(page.getByText('Updated smoke profile').first()).toBeVisible();
    await expect.poll(async () => page.locator('img').evaluateAll(images => images.some(image => image instanceof HTMLImageElement && image.src.startsWith('blob:') && image.complete && image.naturalWidth > 0))).toBe(true);
  } finally {
    await Promise.all([context.close(), otherContext.close()]);
  }
});
