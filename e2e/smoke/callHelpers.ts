import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export const report = (label: string, value: unknown) => {
  process.stdout.write(`[calls] ${label}: ${JSON.stringify(value)}\n`);
};

export const FAKE_MEDIA_ARGS = [
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required',
];

export interface CallParticipant {
  user_id: string;
  state: string;
  session_id: string | null;
  identity_key: string | null;
}

export interface CallView {
  id: string;
  chat_id: string;
  kind: string;
  state: string;
  end_reason: string | null;
  epoch: number;
  version: number;
  participants: CallParticipant[];
}

export interface TrackedContext {
  context: BrowserContext;
  page: Page;
  errors: string[];
}

const apiUrl = () => process.env.E2E_API_URL!;

export const callContext = async (browser: Browser, label: string): Promise<TrackedContext> => {
  const context = await browser.newContext({ permissions: ['microphone'] });
  await context.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
    const probe = { pcs: [] as RTCPeerConnection[], tracks: [] as MediaStreamTrack[] };
    Object.assign(window, { __callProbe: probe });
    const Original = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Original {
      constructor(...args: ConstructorParameters<typeof RTCPeerConnection>) {
        super(...args);
        probe.pcs.push(this);
      }
    };
    type Frame = { size: number; tail: number[] };
    const frames = { plainSent: [] as Frame[], encryptedSent: [] as Frame[], encryptedReceived: [] as Frame[], decryptedReceived: [] as Frame[] };
    Object.assign(probe, { frames });
    const record = (list: Frame[]) => new TransformStream<RTCEncodedAudioFrame, RTCEncodedAudioFrame>({
      transform(frame, controller) {
        const data = new Uint8Array(frame.data);
        list.push({ size: data.length, tail: [data[data.length - 2], data[data.length - 1]] });
        if (list.length > 200) list.shift();
        controller.enqueue(frame);
      },
    });
    type Encoded = { readable: ReadableStream<RTCEncodedAudioFrame>; writable: WritableStream<RTCEncodedAudioFrame> };
    const tap = (prototype: object, before: Frame[], after: Frame[]) => {
      const target = prototype as { createEncodedStreams?: () => Encoded };
      const create = target.createEncodedStreams;
      if (!create) return;
      target.createEncodedStreams = function (this: RTCRtpSender | RTCRtpReceiver) {
        const streams = create.call(this);
        if (this.track?.kind !== 'audio') return streams;
        const output = record(after);
        void output.readable.pipeTo(streams.writable);
        return { readable: streams.readable.pipeThrough(record(before)), writable: output.writable };
      };
    };
    tap(RTCRtpSender.prototype, frames.plainSent, frames.encryptedSent);
    tap(RTCRtpReceiver.prototype, frames.encryptedReceived, frames.decryptedReceived);
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await getUserMedia(constraints);
      probe.tracks.push(...stream.getTracks());
      return stream;
    };
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(`[${label}] ${message.text()}`);
  });
  page.on('pageerror', (error) => { errors.push(`[${label}] pageerror ${error.message}`); });
  page.on('response', async (response) => {
    if (response.status() < 400) return;
    const detail = response.status() === 409 ? ` ${await response.text().catch(() => '')}` : '';
    errors.push(`[${label}] HTTP ${response.status()} ${response.request().method()} ${new URL(response.url()).pathname}${detail}`);
  });
  return { context, page, errors };
};

export const apiRequest = async <T>(page: Page, path: string, init: { method?: string; body?: unknown } = {}) => page.evaluate(
  async ({ api, path: target, method, body }) => {
    const response = await fetch(`${api}${target}`, {
      method: method ?? 'GET',
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  },
  { api: apiUrl(), path, method: init.method, body: init.body },
) as Promise<{ status: number; body: T }>;

export const callsEnabled = async (page: Page) => {
  const response = await apiRequest<{ enabled: boolean }>(page, '/calls/config');
  return response.status === 200 && response.body.enabled === true;
};

export const myId = async (page: Page) => (await apiRequest<{ id: string }>(page, '/me')).body.id;

export const getCall = async (page: Page, callId: string) => (await apiRequest<CallView>(page, `/calls/${callId}`)).body;

export const listCalls = async (page: Page) => {
  const response = await apiRequest<CallView[] | { items: CallView[] }>(page, '/calls');
  return Array.isArray(response.body) ? response.body : response.body.items;
};

export const currentCallId = async (page: Page) => {
  let id = '';
  await expect.poll(async () => {
    const calls = await listCalls(page);
    id = calls.find((call) => call.state !== 'ended')?.id ?? '';
    return id;
  }, { timeout: 15_000 }).not.toBe('');
  return id;
};

export const callPanel = (page: Page) => page.getByRole('region', { name: 'Audio call' });

export const securityCode = async (page: Page) => {
  const panel = callPanel(page);
  const show = panel.getByRole('button', { name: 'Show security code' });
  if (await show.isVisible()) await show.click();
  const code = panel.getByTestId('call-security-code');
  await expect(code).toHaveText(/^(\d{5}){6}$/);
  return (await code.textContent()) ?? '';
};

export const waitForCodeChange = async (page: Page, previous: string) => {
  await expect(callPanel(page).getByTestId('call-security-code')).not.toHaveText(previous, { timeout: 20_000 });
  return securityCode(page);
};

export const remoteAudioLevels = (page: Page, windowMs = 2_500) => page.evaluate(async (duration) => {
  const elements = Array.from(document.querySelectorAll<HTMLAudioElement>('[data-call-audio] audio'));
  const context = new AudioContext();
  await context.resume();
  const meters = elements.map((element) => {
    const stream = element.srcObject;
    if (!(stream instanceof MediaStream) || !stream.getAudioTracks().length) return null;
    const analyser = context.createAnalyser();
    context.createMediaStreamSource(stream).connect(analyser);
    return { analyser, samples: new Float32Array(analyser.fftSize), peak: 0 };
  });
  const rounds = Math.ceil(duration / 50);
  for (let round = 0; round < rounds; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    for (const meter of meters) {
      if (!meter) continue;
      meter.analyser.getFloatTimeDomainData(meter.samples);
      for (const sample of meter.samples) meter.peak = Math.max(meter.peak, Math.abs(sample));
    }
  }
  await context.close();
  return meters.map((meter) => Number((meter?.peak ?? 0).toFixed(4)));
}, windowMs);

export const minRemoteLevel = async (page: Page, expectedTracks: number) => {
  const levels = await remoteAudioLevels(page);
  return levels.length === expectedTracks ? Math.min(...levels) : 0;
};

export const transportInfo = (page: Page) => page.evaluate(async () => {
  const probe = (window as unknown as { __callProbe: { pcs: RTCPeerConnection[] } }).__callProbe;
  const result: Array<Record<string, unknown>> = [];
  for (const pc of probe.pcs) {
    if (pc.connectionState === 'closed') continue;
    const stats = await pc.getStats();
    const byId = new Map<string, Record<string, unknown>>();
    stats.forEach((report) => byId.set(report.id, report as Record<string, unknown>));
    let pair: Record<string, unknown> | undefined;
    stats.forEach((report) => {
      if (report.type === 'transport' && report.selectedCandidatePairId) pair = byId.get(report.selectedCandidatePairId as string);
    });
    const local = pair ? byId.get(pair.localCandidateId as string) : undefined;
    const remote = pair ? byId.get(pair.remoteCandidateId as string) : undefined;
    const senders = pc.getSenders().filter((sender) => sender.track?.kind === 'audio');
    const receivers = pc.getReceivers().filter((receiver) => receiver.track?.kind === 'audio');
    const config = pc.getConfiguration() as RTCConfiguration & { encodedInsertableStreams?: boolean };
    let bytesSent = 0;
    let bytesReceived = 0;
    stats.forEach((report) => {
      if (report.type === 'outbound-rtp' && report.kind === 'audio') bytesSent += report.bytesSent ?? 0;
      if (report.type === 'inbound-rtp' && report.kind === 'audio') bytesReceived += report.bytesReceived ?? 0;
    });
    result.push({
      state: pc.connectionState,
      localProtocol: local?.protocol, localType: local?.candidateType,
      remoteProtocol: remote?.protocol, remoteType: remote?.candidateType, remoteAddress: remote?.address, remotePort: remote?.port,
      insertableStreams: config.encodedInsertableStreams === true,
      senderTransforms: senders.map((sender) => !!(sender as RTCRtpSender & { transform?: unknown }).transform),
      receiverTransforms: receivers.map((receiver) => !!(receiver as RTCRtpReceiver & { transform?: unknown }).transform),
      bytesSent, bytesReceived,
    });
  }
  return result;
});

export const microphoneTracks = (page: Page) => page.evaluate(() => {
  const probe = (window as unknown as { __callProbe: { tracks: MediaStreamTrack[] } }).__callProbe;
  return probe.tracks.filter((track) => track.kind === 'audio').map((track) => track.readyState);
});

export const loginOverApi = async (username: string, password: string) => {
  const response = await fetch(`${apiUrl()}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
  });
  expect(response.status).toBe(200);
  return (await response.json() as { access_token: string }).access_token;
};

export const revokeSessionOverApi = async (token: string, sessionId: string) => {
  const response = await fetch(`${apiUrl()}/me/sessions/${sessionId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return response.status;
};

export const getCallOverApi = async (token: string, callId: string) => {
  const response = await fetch(`${apiUrl()}/calls/${callId}`, { headers: { Authorization: `Bearer ${token}` } });
  return await response.json() as CallView;
};

export const frameSummary = (page: Page) => page.evaluate(() => {
  type Frame = { size: number; tail: number[] };
  const probe = (window as unknown as { __callProbe: { frames: Record<string, Frame[]> } }).__callProbe;
  return Object.fromEntries(Object.entries(probe.frames).map(([name, list]) => {
    const recent = list.slice(-50);
    const trailers = [...new Set(recent.map((frame) => frame.tail.join(',')))];
    const average = recent.length ? Math.round(recent.reduce((sum, frame) => sum + frame.size, 0) / recent.length) : 0;
    return [name, { frames: list.length, averageSize: average, trailers: trailers.slice(0, 6), distinctTrailers: trailers.length }];
  }));
});
