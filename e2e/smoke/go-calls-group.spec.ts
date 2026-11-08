import { expect, test, type Page } from '@playwright/test';
import { createSmokeUser, openChatFromList, registerUser, reloadMessenger, type SmokeUser } from './helpers';
import {
  FAKE_MEDIA_ARGS, apiRequest, callContext, callPanel, callsEnabled, currentCallId, getCall, getCallOverApi, loginOverApi, myId, remoteAudioLevels,
  report, revokeSessionOverApi, securityCode, waitForCodeChange, type TrackedContext,
} from './callHelpers';
import { livekitConfig, livekitParticipants, roomName } from './livekitHelpers';

test.use({ launchOptions: { args: FAKE_MEDIA_ARGS } });

const HEARD = 0.01;


interface Member extends TrackedContext {
  user: SmokeUser;
  id: string;
}

const setUpGroup = async (members: Member[], name: string) => {
  for (const [index, member] of members.entries()) {
    await registerUser(member.page, member.user);
    member.id = await myId(member.page);
    if (index === 0) test.skip(!(await callsEnabled(member.page)), 'Calls are disabled on this backend');
  }
  const created = await apiRequest<{ id: string }>(members[0].page, '/groups', {
    method: 'POST', body: { name, member_ids: members.slice(1).map((member) => member.id) },
  });
  expect(created.status).toBe(201);
  for (const member of members) {
    await reloadMessenger(member.page);
    await openChatFromList(member.page, name);
  }
  return created.body.id;
};

const accept = async (page: Page) => {
  const incoming = page.getByRole('alertdialog');
  await expect(incoming).toContainText('Incoming group call', { timeout: 15_000 });
  await incoming.getByRole('button', { name: 'Accept' }).click();
};

const encrypted = async (pages: Page[]) => {
  for (const page of pages) await expect(callPanel(page)).toContainText('End-to-end encrypted', { timeout: 30_000 });
};

const hearsEveryone = async (page: Page, others: number) => {
  let last: number[] = [];
  await expect.poll(async () => {
    last = await remoteAudioLevels(page);
    return last.length === others ? Math.min(...last) : 0;
  }, { timeout: 20_000 }).toBeGreaterThan(HEARD).catch(async (error: unknown) => {
    report('levels when hearing failed', last);
    report('audio elements', await page.evaluate(() => Array.from(document.querySelectorAll<HTMLAudioElement>('[data-call-audio] audio')).map((element) => {
      const track = (element.srcObject as MediaStream | null)?.getAudioTracks()[0];
      return { track: track?.id, state: track?.readyState, muted: track?.muted, paused: element.paused };
    })));
    throw error;
  });
  return last;
};

const closeAll = async (contexts: TrackedContext[]) => {
  report('console errors', contexts.flatMap((context) => context.errors));
  await Promise.all(contexts.map((context) => context.context.close()));
};

const newMember = async (browser: Parameters<typeof callContext>[0], label: string): Promise<Member> => ({
  ...(await callContext(browser, label)), user: createSmokeUser(label.toLowerCase()), id: '',
});

test('three users talk in an encrypted group call, keys rotate when someone leaves and rejoins', async ({ browser, browserName }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go calls API');
  test.skip(browserName !== 'chromium', 'Fake audio devices are a Chromium feature');
  test.setTimeout(240_000);
  const a = await newMember(browser, 'A');
  const b = await newMember(browser, 'B');
  const c = await newMember(browser, 'C');
  try {
    await setUpGroup([a, b, c], `Calls ${a.user.username.slice(-8)}`);

    await a.page.getByRole('button', { name: 'Start audio call' }).click();
    await accept(b.page);
    await accept(c.page);
    await encrypted([a.page, b.page, c.page]);
    const callId = await currentCallId(a.page);
    await expect.poll(async () => (await getCall(a.page, callId)).participants.filter((p) => p.state === 'joined').length).toBe(3);
    const full = await getCall(a.page, callId);
    const [codeA, codeB, codeC] = [await securityCode(a.page), await securityCode(b.page), await securityCode(c.page)];
    report('3 joined', { epoch: full.epoch, codeA, codeB, codeC, equal: codeA === codeB && codeB === codeC });
    expect(codeB).toBe(codeA);
    expect(codeC).toBe(codeA);
    report('levels with 3', { A: await hearsEveryone(a.page, 2), B: await hearsEveryone(b.page, 2), C: await hearsEveryone(c.page, 2) });

    await callPanel(c.page).getByRole('button', { name: 'Leave' }).click();
    await expect(callPanel(c.page)).toBeHidden();
    await expect.poll(async () => (await getCall(a.page, callId)).epoch).toBeGreaterThan(full.epoch);
    const afterLeave = await getCall(a.page, callId);
    const leftA = await waitForCodeChange(a.page, codeA);
    const leftB = await waitForCodeChange(b.page, codeB);
    report('C left', { epoch: afterLeave.epoch, previousEpoch: full.epoch, codeA: leftA, codeB: leftB, equal: leftA === leftB, changed: leftA !== codeA });
    expect(leftA).toBe(leftB);
    await expect(callPanel(a.page)).toContainText('End-to-end encrypted', { timeout: 15_000 });
    report('levels after C left', { A: await hearsEveryone(a.page, 1), B: await hearsEveryone(b.page, 1) });

    const banner = c.page.getByRole('status').filter({ hasText: 'Ongoing group call' });
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await banner.getByRole('button', { name: 'Join' }).click();
    await encrypted([c.page]);
    await expect.poll(async () => (await getCall(a.page, callId)).epoch).toBeGreaterThan(afterLeave.epoch);
    const rejoined = await getCall(a.page, callId);
    const [codeA2, codeB2, codeC2] = [
      await waitForCodeChange(a.page, leftA), await waitForCodeChange(b.page, leftB), await securityCode(c.page),
    ];
    report('C rejoined', { epoch: rejoined.epoch, codeA: codeA2, codeB: codeB2, codeC: codeC2, equal: codeA2 === codeB2 && codeB2 === codeC2 });
    expect(codeB2).toBe(codeA2);
    expect(codeC2).toBe(codeA2);
    report('levels after rejoin', { A: await hearsEveryone(a.page, 2), B: await hearsEveryone(b.page, 2), C: await hearsEveryone(c.page, 2) });

    await callPanel(a.page).getByRole('button', { name: 'End for everyone' }).click();
    for (const member of [a, b, c]) await expect(callPanel(member.page)).toBeHidden({ timeout: 15_000 });
    await expect.poll(async () => (await getCall(a.page, callId)).state).toBe('ended');
    report('ended', { end_reason: (await getCall(a.page, callId)).end_reason });
    await expect(a.page.getByTestId('system-message').filter({ hasText: /^Group call · \d+:\d{2}$/ })).toBeVisible({ timeout: 15_000 });
  } finally {
    await closeAll([a, b, c]);
  }
});

test('a revoked session is removed from the group call at once', async ({ browser, browserName }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go calls API');
  test.skip(browserName !== 'chromium', 'Fake audio devices are a Chromium feature');
  test.setTimeout(240_000);
  const a = await newMember(browser, 'A');
  const b = await newMember(browser, 'B');
  const c = await newMember(browser, 'C');
  try {
    await setUpGroup([a, b, c], `Revoke ${a.user.username.slice(-8)}`);

    await a.page.getByRole('button', { name: 'Start audio call' }).click();
    await accept(b.page);
    await accept(c.page);
    await encrypted([a.page, b.page, c.page]);
    const callId = await currentCallId(a.page);
    await expect.poll(async () => (await getCall(a.page, callId)).participants.filter((p) => p.state === 'joined').length).toBe(3);
    const before = await getCall(a.page, callId);
    const sessionB = before.participants.find((participant) => participant.user_id === b.id)!.session_id!;
    const codeA = await securityCode(a.page);
    await hearsEveryone(a.page, 2);
    const identityB = `${b.id}:${sessionB}`;
    if (livekitConfig()) {
      expect((await livekitParticipants(roomName(callId))).map((participant) => participant.identity)).toContain(identityB);
    }

    const otherDevice = await loginOverApi(b.user.username, b.user.password);
    const revokedAt = Date.now();
    expect(await revokeSessionOverApi(otherDevice, sessionB)).toBe(204);

    let removedMs = -1;
    if (livekitConfig()) {
      const identities = async () => (await livekitParticipants(roomName(callId))).map((participant) => participant.identity);
      await expect.poll(identities, { timeout: 10_000, intervals: [100] }).not.toContain(identityB);
      removedMs = Date.now() - revokedAt;
    }
    await expect.poll(async () => (await getCall(a.page, callId)).participants.find((p) => p.user_id === b.id)?.state, { timeout: 10_000 })
      .not.toBe('joined');
    const after = await getCall(a.page, callId);
    const newCodeA = await waitForCodeChange(a.page, codeA);
    const newCodeC = await securityCode(c.page);
    report('B revoked', {
      epochBefore: before.epoch, epochAfter: after.epoch, stateB: after.participants.find((p) => p.user_id === b.id)?.state,
      removedFromMediaRoomMs: removedMs, codeA: newCodeA, codeC: newCodeC, equal: newCodeA === newCodeC,
    });
    expect(after.epoch).toBeGreaterThan(before.epoch);
    expect(newCodeC).toBe(newCodeA);
    await expect(callPanel(b.page)).toBeHidden({ timeout: 15_000 });
    report('levels after revoke', { A: await hearsEveryone(a.page, 1), C: await hearsEveryone(c.page, 1) });

    await Promise.all([a.context.close(), c.context.close()]);
    await expect.poll(async () => (await getCallOverApi(otherDevice, callId)).state, { timeout: 60_000, intervals: [1_000] }).toBe('ended');
    const closed = await getCallOverApi(otherDevice, callId);
    report('everyone closed the tab', { state: closed.state, end_reason: closed.end_reason });
    expect(closed.end_reason).toBe('completed');
  } finally {
    await closeAll([a, b, c]);
  }
});
