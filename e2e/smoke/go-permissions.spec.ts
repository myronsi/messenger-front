import { expect, test, type Page } from '@playwright/test';
import { createEnglishContext, loginUser } from './helpers';

const request = async <T>(page: Page, path: string, method = 'GET', body?: unknown, expected = 200): Promise<T> => {
  const perform = () => page.evaluate(async ({ path, method, body, api }) => {
    const response = await fetch(`${api || `${location.origin}/api/v2`}${path}`, {
      method, headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json(), retryAfter: Number(response.headers.get('Retry-After') || 1) };
  }, { path, method, body, api: process.env.E2E_API_URL });
  let result = await perform();
  // Fixture generation observes the server's flood limit and preserves each
  // client_temp_id when retrying; it does not require weakened runtime limits.
  for (let attempt = 0; result.status === 429 && expected !== 429 && attempt < 4; attempt++) {
    await new Promise(resolve => setTimeout(resolve, Math.min(5000, Math.max(1, result.retryAfter) * 1000)));
    result = await perform();
  }
  expect(result.status, `${method} ${path}`).toBe(expected);
  return result.data as T;
};

test('Go group permissions and older/newer history work through the frontend transport', async ({ browser }) => {
  test.skip(process.env.GO_API_TESTS !== '1' || !process.env.GO_TEST_USER_A || !process.env.GO_TEST_PASSWORD_A ||
    !process.env.GO_TEST_USER_B || !process.env.GO_TEST_PASSWORD_B, 'Uses existing synthetic Go staging fixtures');
  const contextA = await createEnglishContext(browser);
  const contextB = await createEnglishContext(browser);
  const a = await contextA.newPage(), b = await contextB.newPage();
  const peer = process.env.GO_TEST_USER_B!;
  try {
    await loginUser(a, { username: process.env.GO_TEST_USER_A!, password: process.env.GO_TEST_PASSWORD_A!, displayName: 'Owner fixture' });
    await loginUser(b, { username: peer, password: process.env.GO_TEST_PASSWORD_B!, displayName: 'Member fixture' });
    const group = await request<{chat_id: string}>(a, '/groups/create', 'POST', {
      name: 'Permission transport audit', participants: [peer],
    }, 201);
    const path = `/groups/${group.chat_id}`;
    await request(b, path, 'PATCH', { name: 'Forbidden edit' }, 403);
    await request(a, `${path}/participants/${peer}/role`, 'PATCH', { role: 'admin' });
    await request(b, path, 'PATCH', { name: 'Allowed admin edit' });
    await request(b, path, 'DELETE', undefined, 403);
    await request(a, `${path}/participants/${peer}/role`, 'PATCH', { role: 'member' });
    await request(b, path, 'PATCH', { name: 'Forbidden edit' }, 403);
    const sent: string[] = [];
    for (let i = 0; i < 24; i++) {
      const message = await request<{id: string}>(a, `/chats/${group.chat_id}/messages`, 'POST', {
        type: 'text', client_temp_id: crypto.randomUUID(), content: `History transport fixture ${i}`,
      }, 201);
      sent.push(message.id);
    }
    type History = {history: Array<{id: string; is_system?: boolean}>; next_before_id: string | null; next_after_id: string | null; has_more_after: boolean};
    let before: string | null = null;
    let older: string[] = [];
    do {
      const query: string = `/messages/history/${group.chat_id}?limit=5${before ? `&before_id=${before}` : ''}`;
      const page: History = await request(a, query);
      older = [...page.history.filter(message => !message.is_system).map(message => message.id), ...older]; before = page.next_before_id;
    } while (before);
    expect(older).toEqual(sent);
    let after: string | null = sent[0];
    const newer: string[] = [];
    do {
      const page: History = await request(a, `/messages/history/${group.chat_id}?limit=5&after_id=${after}`);
      newer.push(...page.history.map(message => message.id)); after = page.has_more_after ? page.next_after_id : null;
    } while (after);
    expect(newer).toEqual(sent.slice(1));
    await request(a, `${path}/transfer-owner`, 'POST', { username: peer });
    await request(a, `${path}/leave`, 'DELETE');
    await request(b, `/groups/delete/${group.chat_id}`, 'DELETE');
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
