import { expect, test, type Page } from '@playwright/test';
import {
  approvePendingRequestIfPresent, createSmokeUser, openChatFromList, openPreviewChat, registerUser, reloadMessenger, sendMessage,
  waitForChatListItem, type SmokeUser,
} from './helpers';
import {
  FAKE_MEDIA_ARGS, callContext, callPanel, callsEnabled, currentCallId, frameSummary, getCall, microphoneTracks, minRemoteLevel, remoteAudioLevels,
  report, securityCode, transportInfo, type TrackedContext,
} from './callHelpers';
import { eavesdrop, livekitConfig, livekitParticipants, roomName } from './livekitHelpers';

test.use({ launchOptions: { args: FAKE_MEDIA_ARGS } });

const HEARD = 0.01;
const SILENT = 0.003;

const setUpDirectChat = async (a: Page, b: Page, caller: SmokeUser, callee: SmokeUser) => {
  await registerUser(a, caller);
  await registerUser(b, callee);
  test.skip(!(await callsEnabled(a)), 'Calls are disabled on this backend');
  await openPreviewChat(a, callee.username);
  await sendMessage(a, 'Ready for a call?');
  await approvePendingRequestIfPresent(b, caller.username);
  await reloadMessenger(a);
  await reloadMessenger(b);
  await waitForChatListItem(b, caller.username);
  await openChatFromList(a, callee.username);
};


const closeAll = async (contexts: TrackedContext[]) => {
  const errors = contexts.flatMap((context) => context.errors);
  report('console errors', errors);
  await Promise.all(contexts.map((context) => context.context.close()));
};

test('two users talk in an end-to-end encrypted direct call', async ({ browser, browserName }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go calls API');
  test.skip(browserName !== 'chromium', 'Fake audio devices are a Chromium feature');
  test.setTimeout(180_000);
  const caller = createSmokeUser('caller');
  const callee = createSmokeUser('callee');
  const a = await callContext(browser, 'A');
  const b = await callContext(browser, 'B');
  const pageA = a.page;
  const pageB = b.page;
  try {
    await setUpDirectChat(pageA, pageB, caller, callee);

    await pageA.getByRole('button', { name: 'Start audio call' }).click();
    const incoming = pageB.getByRole('alertdialog');
    await expect(incoming).toContainText('Incoming call');
    await incoming.getByRole('button', { name: 'Accept' }).click();

    for (const page of [pageA, pageB]) {
      await expect(callPanel(page)).toContainText('End-to-end encrypted', { timeout: 30_000 });
    }
    const callId = await currentCallId(pageA);
    const active = await getCall(pageA, callId);
    expect(active.state).toBe('active');
    report('direct call', { callId, epoch: active.epoch, joined: active.participants.filter((p) => p.state === 'joined').length });

    const codeA = await securityCode(pageA);
    const codeB = await securityCode(pageB);
    report('security codes', { codeA, codeB, equal: codeA === codeB });
    expect(codeA).toBe(codeB);

    await expect.poll(() => minRemoteLevel(pageB, 1), { timeout: 20_000 }).toBeGreaterThan(HEARD);
    await expect.poll(() => minRemoteLevel(pageA, 1), { timeout: 20_000 }).toBeGreaterThan(HEARD);
    report('levels while talking', { aHearsB: await remoteAudioLevels(pageA), bHearsA: await remoteAudioLevels(pageB) });

    const framesA = await frameSummary(pageA);
    const framesB = await frameSummary(pageB);
    report('frames at A', framesA);
    report('frames at B', framesB);
    const trailer = `12,${active.epoch % 16}`;
    expect(framesA.encryptedSent.trailers).toEqual([trailer]);
    expect(framesB.encryptedReceived.trailers).toEqual([trailer]);
    expect(framesA.plainSent.distinctTrailers).toBeGreaterThan(1);
    expect(framesB.encryptedReceived.averageSize - framesB.decryptedReceived.averageSize).toBeGreaterThanOrEqual(28);

    const transport = await transportInfo(pageA);
    report('transport A', transport);
    expect(transport.some((pc) => (pc.senderTransforms as boolean[]).length > 0)).toBe(true);
    for (const pc of transport) {
      expect(pc.insertableStreams || [...(pc.senderTransforms as boolean[]), ...(pc.receiverTransforms as boolean[])].every(Boolean)).toBe(true);
    }

    if (livekitConfig()) {
      const participants = await livekitParticipants(roomName(callId));
      const tracks = participants.map((participant) => ({ identity: participant.identity, tracks: participant.tracks?.map((track) => track.encryption) }));
      report('livekit participants', tracks);
      expect(participants).toHaveLength(2);
      for (const participant of participants) {
        expect(participant.tracks?.length).toBeGreaterThan(0);
        for (const track of participant.tracks ?? []) expect(track.encryption).toBe('GCM');
      }
      const intruder = await eavesdrop(browser, callId, 'plain');
      report('foreign identity in the room', intruder);
      expect(intruder.removedAfterMs).not.toBeNull();
      expect(intruder.removedAfterMs!).toBeLessThan(3_000);
      const plain = await eavesdrop(browser, callId, 'plain', true);
      report('hidden keyless subscriber (no E2EE)', plain);
      const wrongKey = await eavesdrop(browser, callId, 'wrong-key', true);
      report('hidden keyless subscriber (E2EE, wrong key)', wrongKey);
      for (const result of [plain, wrongKey]) expect(result.tracks.every((track) => track.publicationEncrypted)).toBe(true);
      expect(wrongKey.peakLevel).toBeLessThan(SILENT);
      const afterIntruders = await livekitParticipants(roomName(callId));
      report('livekit participants after intruders', afterIntruders.map((participant) => participant.identity));
      expect(afterIntruders.map((participant) => participant.identity).sort()).toEqual(tracks.map((track) => track.identity).sort());
    }

    await callPanel(pageA).getByRole('button', { name: 'Mute microphone' }).click();
    await expect(callPanel(pageA).getByRole('button', { name: 'Mute microphone' })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await remoteAudioLevels(pageB))[0] ?? 0, { timeout: 15_000 }).toBeLessThan(SILENT);
    report('B hears A after mute', await remoteAudioLevels(pageB));
    await callPanel(pageA).getByRole('button', { name: 'Mute microphone' }).click();
    await expect(callPanel(pageA).getByRole('button', { name: 'Mute microphone' })).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => minRemoteLevel(pageB, 1), { timeout: 15_000 }).toBeGreaterThan(HEARD);
    report('B hears A after unmute', await remoteAudioLevels(pageB));

    await callPanel(pageA).getByRole('button', { name: 'Leave' }).click();
    await expect(callPanel(pageA)).toBeHidden();
    await expect(callPanel(pageB)).toBeHidden({ timeout: 15_000 });
    await expect(pageB.getByText('The call has ended.')).toBeVisible();
    await expect.poll(async () => (await getCall(pageA, callId)).state).toBe('ended');
    const ended = await getCall(pageA, callId);
    report('ended call', { state: ended.state, end_reason: ended.end_reason, epoch: ended.epoch });
    expect(ended.end_reason).toBe('completed');

    for (const page of [pageA, pageB]) {
      await expect.poll(() => microphoneTracks(page)).not.toContain('live');
    }
    report('microphone tracks after hang-up', { A: await microphoneTracks(pageA), B: await microphoneTracks(pageB) });
    await openChatFromList(pageB, caller.username);
    await expect(pageB.getByTestId('system-message').filter({ hasText: /^Call · \d+:\d{2}$/ })).toBeVisible({ timeout: 15_000 });
    await expect(pageA.getByTestId('system-message').filter({ hasText: /^Call · \d+:\d{2}$/ })).toBeVisible({ timeout: 15_000 });
  } finally {
    await closeAll([a, b]);
  }
});

test('a declined direct call ends as declined, an unanswered one as missed', async ({ browser, browserName }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go calls API');
  test.skip(browserName !== 'chromium', 'Fake audio devices are a Chromium feature');
  test.setTimeout(180_000);
  const caller = createSmokeUser('ringer');
  const callee = createSmokeUser('busy');
  const a = await callContext(browser, 'A');
  const b = await callContext(browser, 'B');
  const pageA = a.page;
  const pageB = b.page;
  try {
    await setUpDirectChat(pageA, pageB, caller, callee);

    await pageA.getByRole('button', { name: 'Start audio call' }).click();
    const incoming = pageB.getByRole('alertdialog');
    await expect(incoming).toContainText('Incoming call');
    const declinedId = await currentCallId(pageA);
    await incoming.getByRole('button', { name: 'Decline' }).click();
    await expect(incoming).toBeHidden();
    await expect.poll(async () => (await getCall(pageA, declinedId)).state, { timeout: 15_000 }).toBe('ended');
    const declined = await getCall(pageA, declinedId);
    report('declined call', { state: declined.state, end_reason: declined.end_reason });
    expect(declined.end_reason).toBe('declined');
    await expect(callPanel(pageA)).toBeHidden({ timeout: 15_000 });
    await expect.poll(() => microphoneTracks(pageA)).not.toContain('live');
    await expect(pageA.getByTestId('system-message').filter({ hasText: 'Call declined' })).toBeVisible({ timeout: 15_000 });

    await pageA.getByRole('button', { name: 'Start audio call' }).click();
    await expect(pageB.getByRole('alertdialog')).toContainText('Incoming call');
    const missedId = await currentCallId(pageA);
    const ringing = await getCall(pageA, missedId);
    report('unanswered call', { state: ringing.state, ring_expires_at: (ringing as unknown as { ring_expires_at: string }).ring_expires_at });
    await expect.poll(async () => (await getCall(pageA, missedId)).state, { timeout: 60_000, intervals: [1_000] }).toBe('ended');
    const missed = await getCall(pageA, missedId);
    report('missed call', { state: missed.state, end_reason: missed.end_reason, participants: missed.participants.map((p) => p.state) });
    expect(missed.end_reason).toBe('missed');
    await expect(pageB.getByRole('alertdialog')).toBeHidden({ timeout: 15_000 });
    await expect(callPanel(pageA)).toBeHidden({ timeout: 15_000 });
    await expect.poll(() => microphoneTracks(pageA)).not.toContain('live');
    await openChatFromList(pageB, caller.username);
    await expect(pageB.getByTestId('system-message').filter({ hasText: 'Missed call' })).toBeVisible({ timeout: 15_000 });
  } finally {
    await closeAll([a, b]);
  }
});
