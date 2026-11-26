import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  acceptChatRequestIfPresent, allowGroupInvites, approvePendingRequestIfPresent, createSmokeUser, openChatFromList, openPreviewChat, registerUser,
  reloadMessenger, sendMessage, waitForChatListItem, type SmokeUser,
} from './helpers';
import { apiRequest, callContext, callPanel, currentCallId, getCall, myId, report, type TrackedContext } from './callHelpers';
import { livekitConfig, livekitParticipants, roomName } from './livekitHelpers';
import { VIDEO_MEDIA_ARGS, VIDEO_PERMISSIONS, noVideo, playingVideos, remoteVideo, startSharing, toggleCamera } from './videoHelpers';

test.use({ launchOptions: { args: VIDEO_MEDIA_ARGS } });

interface Member extends TrackedContext {
  user: SmokeUser;
  id: string;
}

const newMember = async (browser: Browser, label: string): Promise<Member> => ({
  ...(await callContext(browser, label, VIDEO_PERMISSIONS)), user: createSmokeUser(label.toLowerCase()), id: '',
});

const videoConfig = async (page: Page) => (await apiRequest<{ enabled: boolean; video_enabled?: boolean; screen_share_enabled?: boolean }>(page, '/calls/config')).body;

const skipWithoutVideo = async (page: Page) => {
  const config = await videoConfig(page);
  test.skip(!config.enabled || !config.video_enabled || !config.screen_share_enabled, 'Video or screen sharing is off on this backend');
};

const encrypted = async (pages: Page[]) => {
  for (const page of pages) await expect(callPanel(page)).toContainText('End-to-end encrypted', { timeout: 30_000 });
};

const accept = async (page: Page, text: string) => {
  const incoming = page.getByRole('alertdialog');
  await expect(incoming).toContainText(text, { timeout: 15_000 });
  await incoming.getByRole('button', { name: 'Accept' }).click();
};

const closeAll = async (contexts: TrackedContext[]) => {
  report('console errors', contexts.flatMap((context) => context.errors));
  await Promise.all(contexts.map((context) => context.context.close()));
};

const setUpDirectChat = async (a: Member, b: Member) => {
  await registerUser(a.page, a.user);
  await skipWithoutVideo(a.page);
  await registerUser(b.page, b.user);
  await openPreviewChat(a.page, b.user.username);
  await sendMessage(a.page, 'Video?');
  await approvePendingRequestIfPresent(b.page, a.user.username);
  await acceptChatRequestIfPresent(b.page, a.user.username);
  await reloadMessenger(a.page);
  await reloadMessenger(b.page);
  await waitForChatListItem(b.page, a.user.username);
  await openChatFromList(a.page, b.user.username);
};

const setUpGroup = async (members: Member[], name: string) => {
  for (const [index, member] of members.entries()) {
    await registerUser(member.page, member.user);
    member.id = await myId(member.page);
    if (index > 0) await allowGroupInvites(member.page);
    if (index === 0) await skipWithoutVideo(member.page);
  }
  const created = await apiRequest<{ id: string }>(members[0].page, '/groups', {
    method: 'POST', body: { name, member_ids: members.slice(1).map((member) => member.id) },
  });
  expect(created.status).toBe(201);
  for (const member of members) {
    await reloadMessenger(member.page);
    await openChatFromList(member.page, name);
  }
};

test('camera and screen share travel end-to-end encrypted in a direct call', async ({ browser, browserName }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go calls API');
  test.skip(browserName !== 'chromium', 'Fake camera and screen capture are Chromium features');
  test.setTimeout(240_000);
  const a = await newMember(browser, 'A');
  const b = await newMember(browser, 'B');
  try {
    await setUpDirectChat(a, b);
    await a.page.getByRole('button', { name: 'Start audio call' }).click();
    await accept(b.page, 'Incoming call');
    await encrypted([a.page, b.page]);
    const callId = await currentCallId(a.page);
    await noVideo(b.page, remoteVideo('camera'));

    await toggleCamera(a.page, true);
    const bSeesA = await playingVideos(b.page, remoteVideo('camera'), 1);
    report('B sees A camera', bSeesA);
    expect(bSeesA[0].width).toBeGreaterThanOrEqual(320);
    await toggleCamera(b.page, true);
    report('A sees B camera', await playingVideos(a.page, remoteVideo('camera'), 1));

    if (livekitConfig()) {
      const participants = await livekitParticipants(roomName(callId));
      const tracks = participants.flatMap((participant) => (participant.tracks ?? []).map((track) => ({
        identity: participant.identity, source: track.source, type: track.type, encryption: track.encryption,
      })));
      report('livekit tracks', tracks);
      expect(tracks.filter((track) => track.source === 'CAMERA')).toHaveLength(2);
      expect(tracks.every((track) => track.encryption === 'GCM')).toBe(true);
    }

    await startSharing(a.page);
    await expect(a.page.getByText('You are sharing your screen')).toBeVisible({ timeout: 15_000 });
    await expect(b.page.locator('[data-call-layout="stage"]')).toBeVisible({ timeout: 15_000 });
    report('B sees A screen', await playingVideos(b.page, remoteVideo('screen'), 1));
    if (livekitConfig()) {
      const shared = (await livekitParticipants(roomName(callId))).flatMap((participant) => participant.tracks ?? []).filter((track) => track.source === 'SCREEN_SHARE');
      report('livekit screen tracks', shared.map((track) => track.encryption));
      expect(shared.map((track) => track.encryption)).toEqual(['GCM']);
    }

    await startSharing(b.page);
    report('A sees B screen', await playingVideos(a.page, remoteVideo('screen'), 1));

    await a.page.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(a.page.getByText('You are sharing your screen')).toBeHidden();
    await expect.poll(async () => (await b.page.locator(remoteVideo('screen')).count())).toBe(0);
    await callPanel(b.page).getByRole('button', { name: 'Stop sharing' }).click();
    await expect(b.page.locator('[data-call-layout="stage"]')).toBeHidden({ timeout: 15_000 });

    await toggleCamera(a.page, false);
    await expect.poll(async () => (await b.page.locator(remoteVideo('camera')).count()), { timeout: 15_000 }).toBe(0);
    report('A camera tracks after off', await a.page.evaluate(() => {
      const probe = (window as unknown as { __callProbe: { tracks: MediaStreamTrack[] } }).__callProbe;
      return probe.tracks.filter((track) => track.kind === 'video').map((track) => track.readyState);
    }));
  } finally {
    await closeAll([a, b]);
  }
});

test('three users with cameras and two screen shares keep video through a key change', async ({ browser, browserName }) => {
  test.skip(process.env.GO_API_TESTS !== '1', 'Requires the Go calls API');
  test.skip(browserName !== 'chromium', 'Fake camera and screen capture are Chromium features');
  test.setTimeout(240_000);
  const a = await newMember(browser, 'A');
  const b = await newMember(browser, 'B');
  const c = await newMember(browser, 'C');
  try {
    await setUpGroup([a, b, c], `Video ${a.user.username.slice(-8)}`);
    await a.page.getByRole('button', { name: 'Start audio call' }).click();
    await accept(b.page, 'Incoming group call');
    await accept(c.page, 'Incoming group call');
    await encrypted([a.page, b.page, c.page]);
    const callId = await currentCallId(a.page);

    await toggleCamera(a.page, true);
    await toggleCamera(b.page, true);
    report('C sees two cameras', await playingVideos(c.page, remoteVideo('camera'), 2));

    await startSharing(a.page);
    await startSharing(b.page);
    const screens = c.page.getByRole('radiogroup', { name: 'Shared screens' });
    await expect(screens.getByRole('radio')).toHaveCount(2, { timeout: 15_000 });
    report('C sees the chosen screen', await playingVideos(c.page, remoteVideo('screen'), 1));
    await screens.getByRole('radio', { checked: false }).click();
    report('C sees the other screen', await playingVideos(c.page, remoteVideo('screen'), 1));

    const before = await getCall(a.page, callId);
    await callPanel(c.page).getByRole('button', { name: 'Leave' }).click();
    await expect(callPanel(c.page)).toBeHidden();
    await expect.poll(async () => (await getCall(a.page, callId)).epoch).toBeGreaterThan(before.epoch);
    const after = await getCall(a.page, callId);
    report('epoch after leave', { before: before.epoch, after: after.epoch });
    report('A sees B camera after the key change', await playingVideos(a.page, remoteVideo('camera'), 1));
    report('B sees A camera after the key change', await playingVideos(b.page, remoteVideo('camera'), 1));
  } finally {
    await closeAll([a, b, c]);
  }
});
